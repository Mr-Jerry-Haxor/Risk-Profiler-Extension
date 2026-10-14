import {
    getAssessmentList,
    getAssessmentDetail,
    getRiskProfilerSurveyTemplates
}
from "./api/cairoApi.js";

import {
    validateBatch
}
from "./core/batchValidator.js";

import {
    saveAssessments,
    saveReviewResults,
    saveValidationResults,
    setValue,
    getValue
}
from "./storage/storage.js";

import {
    reviewBatch
}
from "./core/reviewEngine.js";

import {
    CONFIG,
    PREREQUISITE_CHECKS,
    URLS
}
from "./utils/constants.js";

import { fetchJson, setRequestRecoveryHandlers, cancelPendingRequests, endpointTemplate, probeDirectEndpoint, probeSiteSession, clearCache } from "./api/requestManager.js";

import { parseCairoSurveyUrl, isSupportedCairoSurvey, resolveCairoAssessment } from "./core/cairoIntegration.js";

let cairoJobRunning = false;
let currentCairoJob = null;
let currentCairoReady = null;
const runningAssessments = { validation: [], review: [] };
let cairoTemplatesPromise = null;
let cairoTemplatesUpdatedAt = 0;
let replacingJob = false;
let jobGeneration = 0;
let jobStopController = new AbortController();
let forceStopPromise = null;
const activeJobPromises = new Set();
let prerequisiteCheckInFlight = null;
let requestDebugLogging = false;
const PREREQUISITE_FRESHNESS_MS = 30000;

function trackJob(promise) {
    activeJobPromises.add(promise);
    promise.then(() => activeJobPromises.delete(promise), () => activeJobPromises.delete(promise));
    return promise;
}

function trackedProgress(callback) {
    return progress => trackJob(callback(progress));
}

function jobRunningError() {
    return Object.assign(new Error("Another assessment job is running. Wait for it to finish or cancel it and start the current app."), { code: "JOB_RUNNING" });
}

function validateJobAssessments(assessments) {
    if (!Array.isArray(assessments) || !assessments.length || assessments.some(item =>
        !item || !/^[1-9]\d*$/.test(String(item.assessmentId ?? "")) ||
        !/^[1-9]\d*$/.test(String(item.assetId ?? "")) ||
        typeof item.assetName !== "string" || !item.assetName.trim())) {
        throw new Error("Select valid assessments before starting a job.");
    }
}

function isPluginPage(sender) {
    if (sender?.id !== chrome.runtime.id) return false;
    try {
        const url = new URL(sender.url);
        const expected = new URL(chrome.runtime.getURL("popup.html"));
        return url.protocol === expected.protocol && url.host === expected.host && url.pathname === expected.pathname;
    } catch { return false; }
}

async function clearIdleResults(clearData) {
    if (cairoJobRunning || replacingJob || validationRunning || reviewRunning) throw jobRunningError();
    replacingJob = true;
    try {
        await clearData();
        const mode = clearData === clearReviewData ? "review" : "validation";
        const saved = await chrome.storage.session.get(null);
        const keys = Object.entries(saved).filter(([key, job]) => key.startsWith("cairoJob:") && job.mode === mode).map(([key]) => key);
        if (keys.length) await chrome.storage.session.remove(keys);
    }
    finally { replacingJob = false; }
}

async function stopAndClearPreviousJobs() {
    jobGeneration++;
    cancellationRequested = true;
    reviewCancellationRequested = true;
    jobStopController.abort();
    cancelPendingRequests();
    // Drain old jobs before resetting flags or storage; fenced callbacks cannot write new results.
    await Promise.allSettled([...activeJobPromises]);
    validationRunning = false;
    reviewRunning = false;
    cairoJobRunning = false;
    currentCairoJob = null;
    runningAssessments.validation = [];
    runningAssessments.review = [];
    currentValidationId = null;
    currentReviewId = null;
    validationStartedAt = null;
    reviewStartedAt = null;
    await clearValidationData();
    await clearReviewData();
    await chrome.storage.local.remove(["lastAction", "validationCompletedAt", "reviewCompletedAt"]);
    const saved = await chrome.storage.session.get(null);
    const keys = Object.keys(saved).filter(key => key.startsWith("cairoJob:"));
    if (keys.length) await chrome.storage.session.remove(keys);
    await chrome.storage.local.set({ resultsResetId: crypto.randomUUID() });
    cairoTemplatesPromise = null;
    jobStopController = new AbortController();
}

function forceStopJobs() {
    if (forceStopPromise) return forceStopPromise;
    if (replacingJob) return Promise.reject(jobRunningError());
    replacingJob = true;
    forceStopPromise = stopAndClearPreviousJobs().finally(() => {
        replacingJob = false;
        forceStopPromise = null;
    });
    return forceStopPromise;
}

function interruptible(promise, signal) {
    if (signal.aborted) return Promise.reject(new Error("Assessment job cancelled by user"));
    return new Promise((resolve, reject) => {
        const onAbort = () => reject(new Error("Assessment job cancelled by user"));
        signal.addEventListener("abort", onAbort, { once: true });
        Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
    });
}

function getSurveyTemplateIds(templates) {
    return [...new Set((Array.isArray(templates) ? templates : [])
        .map(template => Number(template?.surveyTemplateId))
        .filter(Number.isSafeInteger))];
}

async function cacheCairoTemplates(templates) {
    const state = await getValue(CONFIG.STORAGE_KEYS.WHATS_NEW_MODAL) || {};
    const supportedSurveyTemplateIds = getSurveyTemplateIds(templates);
    const updatedAt = Date.now();
    await chrome.storage.local.set({
        [CONFIG.STORAGE_KEYS.WHATS_NEW_MODAL]: {
            ...state,
            templates,
            supportedSurveyTemplateIds,
            updatedAt
        },
        [CONFIG.STORAGE_KEYS.SUPPORTED_SURVEY_TEMPLATE_IDS]: supportedSurveyTemplateIds,
        [CONFIG.STORAGE_KEYS.SUPPORTED_SURVEY_TEMPLATE_IDS_UPDATED_AT]: updatedAt
    });
}

async function getCachedCairoTemplates() {
    const state = await getValue(CONFIG.STORAGE_KEYS.WHATS_NEW_MODAL);
    if (Array.isArray(state?.templates) && state.templates.length) return state.templates;
    const ids = await getValue(CONFIG.STORAGE_KEYS.SUPPORTED_SURVEY_TEMPLATE_IDS);
    if (Array.isArray(ids) && ids.length) {
        return ids.map(surveyTemplateId => ({ surveyTemplateId }));
    }
    return null;
}

async function getCairoTemplates(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = await getCachedCairoTemplates();
        if (cached) return cached;
    }
    if (forceRefresh || !cairoTemplatesPromise || Date.now() - cairoTemplatesUpdatedAt > 60000) {
        cairoTemplatesUpdatedAt = Date.now();
        cairoTemplatesPromise = getRiskProfilerSurveyTemplates().then(async response => {
            const templates = Array.isArray(response) ? response : response?.data;
            if (!Array.isArray(templates)) throw new Error("Unable to load supported RiskProfiler survey templates.");
            await cacheCairoTemplates(templates);
            return templates;
        }).catch(async error => {
            cairoTemplatesPromise = null;
            const cached = await getCachedCairoTemplates();
            if (cached) return cached;
            throw error;
        });
    }
    return cairoTemplatesPromise;
}

async function refreshCairoTemplatesIfOpen() {
    const tabs = await chrome.tabs.query({
        url: "https://cairois.web.boeing.com/*"
    });
    const cairoIsOpen = tabs.some(tab =>
        tab?.id &&
        tab.status === "complete" &&
        !tab.discarded &&
        /^https:\/\/cairois\.web\.boeing\.com\//.test(tab.url || "") &&
        !/\/(?:login|logon|signin|sign-in|wsso)(?:\/|[?#]|$)/i.test(new URL(tab.url).pathname)
    );
    if (!cairoIsOpen) return { updated: false, reason: "cairo-not-open" };

    try {
        const response = await getRiskProfilerSurveyTemplates({
            retryUntilAvailable: false,
            retries: 1,
            allowTabRecovery: false
        });
        const templates = Array.isArray(response) ? response : response?.data;
        if (!Array.isArray(templates) || !templates.length) {
            throw new Error("Cairo returned no Risk Profiler survey templates.");
        }
        await cacheCairoTemplates(templates);
        return { updated: true, count: templates.length };
    } catch (error) {
        // Passive maintenance must never interrupt the user or open a sign-in tab.
        console.info("Skipped background survey-template refresh:", error.message);
        return { updated: false, reason: "cairo-unavailable" };
    }
}

function isTrustedCairoSender(sender) {
    if (sender.id !== chrome.runtime.id || !sender.tab?.id || sender.frameId !== 0) return false;
    try {
        return new URL(sender.url).origin === "https://cairois.web.boeing.com";
    } catch {
        return false;
    }
}

async function resolveCairoMessageRoute(message, sender) {
    if (!isTrustedCairoSender(sender)) return null;
    const tab = await chrome.tabs.get(sender.tab.id);
    let tabOrigin;
    try {
        tabOrigin = new URL(tab.url).origin;
    } catch {
        return null;
    }
    if (tabOrigin !== "https://cairois.web.boeing.com") return null;

    const tabRoute = parseCairoSurveyUrl(tab.url);
    const senderRoute = parseCairoSurveyUrl(sender.url);
    const messageRoute = typeof message.pageUrl === "string"
        ? parseCairoSurveyUrl(message.pageUrl)
        : null;
    if (message.pageUrl !== undefined && !messageRoute) return null;

    const route = tabRoute || messageRoute || senderRoute;
    if (!route) return null;
    for (const candidate of [tabRoute, messageRoute, senderRoute].filter(Boolean)) {
        if (candidate.assessmentId !== route.assessmentId ||
            candidate.surveyTemplateId !== route.surveyTemplateId) {
            throw new Error("The Cairo page has changed. Please try again.");
        }
    }
    return route;
}

async function writeCairoJob(job) {
    await trackJob(chrome.storage.session.set({ [`cairoJob:${job.jobId}`]: job }));
}

function storeReusableCairoJob(job, generation) {
    return trackJob((async () => {
        const saved = await chrome.storage.session.get(null);
        if (generation !== jobGeneration) throw new Error("Assessment job cancelled by user");
        const jobs = Object.entries(saved).filter(([key]) => key.startsWith("cairoJob:"))
            .sort((a, b) => (b[1].startedAt || 0) - (a[1].startedAt || 0));
        const expired = jobs.filter(([, item], index) => index >= 9 || Date.now() - item.startedAt > 86400000);
        if (expired.length) await chrome.storage.session.remove(expired.map(([key]) => key));
        if (generation !== jobGeneration) throw new Error("Assessment job cancelled by user");
        await writeCairoJob(job);
    })());
}

function sameCairoJob(job, route, mode) {
    return job?.mode === mode && String(job.route?.assessmentId) === route.assessmentId &&
        String(job.route?.surveyTemplateId) === route.surveyTemplateId;
}

function resultsForRoute(results, route) {
    return (Array.isArray(results) ? results : []).filter(result =>
        String(result.assessmentId ?? result.assessment?.assessmentId) === route.assessmentId &&
        String(result.surveyTemplateId ?? result.assessment?.surveyTemplateId ?? result.newSurveyTemplateId) === route.surveyTemplateId);
}

async function reusableCairoJob(route, mode) {
    const generation = jobGeneration;
    if (cairoJobRunning && sameCairoJob(currentCairoJob, route, mode)) {
        await currentCairoReady;
        if (generation !== jobGeneration) throw new Error("Assessment job cancelled by user");
        return currentCairoJob;
    }
    const saved = await chrome.storage.session.get(null);
    if (generation !== jobGeneration) throw new Error("Assessment job cancelled by user");
    const runId = mode === "review" ? currentReviewId : currentValidationId;
    const running = mode === "review" ? reviewRunning : validationRunning;
    const linked = Object.entries(saved).find(([key, job]) => key.startsWith("cairoJob:") && sameCairoJob(job, route, mode) &&
        job.linkedRun && job.state === "running" && job.runId === runId)?.[1];
    if (running && linked) return linked;
    const selected = runningAssessments[mode].find(item => String(item.assessmentId) === route.assessmentId);
    // Verify a popup run's template before attaching this Cairo page to it.
    if (running && selected) {
        const detail = selected.surveyTemplateId ? selected : await getAssessmentDetail(route.assessmentId);
        if (generation !== jobGeneration || runId !== (mode === "review" ? currentReviewId : currentValidationId)) {
            throw new Error("Assessment run changed. Please try again.");
        }
        if (String(detail.surveyTemplateId ?? detail.surveyTemplate?.surveyTemplateId) === route.surveyTemplateId) {
            const job = { jobId: crypto.randomUUID(), route, mode, state: "running", linkedRun: true,
                runId: mode === "review" ? currentReviewId : currentValidationId,
                startedAt: mode === "review" ? reviewStartedAt : validationStartedAt, assetName: selected.assetName };
            if (generation !== jobGeneration) throw new Error("Assessment job cancelled by user");
            await storeReusableCairoJob(job, generation);
            return job;
        }
    }
    const snapshot = Object.entries(saved).filter(([key, job]) => key.startsWith("cairoJob:") &&
        sameCairoJob(job, route, mode) && job.state === "complete" && Date.now() - job.startedAt <= 86400000)
        .sort((a, b) => (b[1].completedAt || b[1].startedAt) - (a[1].completedAt || a[1].startedAt))[0]?.[1];
    if (generation !== jobGeneration) throw new Error("Assessment job cancelled by user");
    const data = await chrome.storage.local.get([`${mode}Results`, `${mode}Complete`, `${mode}CompletedAt`]);
    const results = resultsForRoute(data[`${mode}Results`], route);
    if (generation !== jobGeneration) throw new Error("Assessment job cancelled by user");
    if (snapshot && (!data[`${mode}Complete`] || !results.length || (snapshot.completedAt || snapshot.progress?.completedAt || 0) >= (data[`${mode}CompletedAt`] || 0))) return snapshot;
    if (!data[`${mode}Complete`] || !results.length) return null;
    const completedAt = data[`${mode}CompletedAt`];
    const job = { jobId: crypto.randomUUID(), route, mode, state: "complete", results,
        startedAt: completedAt || Date.now(), completedAt };
    await storeReusableCairoJob(job, generation);
    return job;
}

async function processCairoJob(job) {
    const generation = jobGeneration;
    try {
        const [assessments, detail] = await Promise.all([
            refreshAssessments(), getAssessmentDetail(job.route.assessmentId)
        ]);
        const assessment = resolveCairoAssessment(job.route, assessments, detail);
        const reviewMode = await getValue(CONFIG.STORAGE_KEYS.REVIEW_MODE);
        if (generation !== jobGeneration) return;
        const pending = trackJob(job.mode === "review"
            ? runReviewJob([assessment], { mode: reviewMode || "initial" })
            : runValidationJob([assessment]));
        job.state = "running";
        job.runId = job.mode === "review" ? currentReviewId : currentValidationId;
        job.assetName = assessment.assetName;
        await writeCairoJob(job);
        await pending;
        if (generation !== jobGeneration) return;
        const data = await chrome.storage.local.get([
            `${job.mode}Results`, `${job.mode}Error`, `${job.mode}Progress`
        ]);
        job.progress = data[`${job.mode}Progress`];
        job.error = data[`${job.mode}Error`] || null;
        job.results = data[`${job.mode}Results`] || [];
        job.completedAt = job.progress?.completedAt || Date.now();
        job.state = job.error ? "error" : "complete";
    } catch (error) {
        job.state = "error";
        job.error = error.message;
    } finally {
        try {
            if (generation === jobGeneration) await writeCairoJob(job);
        } finally {
            if (generation === jobGeneration) cairoJobRunning = false;
        }
    }
}

async function handleCairoMessage(message, sender) {
    if (message.action === "GET_CAIRO_JOB") {
        const generation = jobGeneration;
        if (sender.id !== chrome.runtime.id || !sender.url?.startsWith(chrome.runtime.getURL("popup.html") + "?view=cairo&")) {
            throw new Error("This result view is not authorized.");
        }
        if (typeof message.jobId !== "string" || !/^[\da-f-]{36}$/.test(message.jobId)) throw new Error("Invalid result view.");
        const key = `cairoJob:${message.jobId}`;
        const job = (await chrome.storage.session.get(key))[key];
        if (generation !== jobGeneration) throw new Error("This result view was cancelled. Run the assessment again.");
        if (!job) throw new Error("This result view has expired. Close it and run the assessment again.");
        if (job.linkedRun && job.state === "running") {
            const data = await chrome.storage.local.get([`${job.mode}Progress`, `${job.mode}Results`, `${job.mode}Error`, `${job.mode}Complete`, `${job.mode}CompletedAt`]);
            const progress = data[`${job.mode}Progress`];
            const running = job.mode === "review" ? reviewRunning : validationRunning;
            const runId = job.mode === "review" ? currentReviewId : currentValidationId;
            if (progress?.runId === job.runId) job.progress = progress;
            if (data[`${job.mode}Complete`] && progress?.runId === job.runId) {
                job.state = "complete";
                job.results = resultsForRoute(data[`${job.mode}Results`], job.route);
                job.completedAt = data[`${job.mode}CompletedAt`];
            } else if (!running || runId !== job.runId) {
                job.state = "error";
                job.error = data[`${job.mode}Error`] || "This assessment run stopped. Re-trigger it to continue.";
            }
            if (generation !== jobGeneration) throw new Error("This result view was cancelled. Run the assessment again.");
            await writeCairoJob(job);
        }
        if (!job.linkedRun && ["preparing", "running"].includes(job.state) && !cairoJobRunning) {
            job.state = "error";
            job.error = "The background worker restarted before this assessment finished. Close this view and run it again.";
            await writeCairoJob(job);
        }
        if (job.state === "running") {
            const data = await chrome.storage.local.get(`${job.mode}Progress`);
            const progress = data[`${job.mode}Progress`];
            if (progress?.runId === job.runId) job.progress = progress;
        }
        return { success: true, job };
    }
    const route = await resolveCairoMessageRoute(message, sender);
    if (!route) throw new Error("This action is only available on a Cairo survey page.");
    const eligible = isSupportedCairoSurvey(route, await getCairoTemplates());
    if (message.action === "CAIRO_SURVEY_ELIGIBILITY") return { success: true, eligible };
    if (!eligible) throw new Error("This survey template is not supported by RiskProfiler.");
    if (!["validation", "review"].includes(message.mode)) throw new Error("Invalid assessment action.");
    if (replacingJob) throw jobRunningError();
    if (message.forceNew !== true && message.replaceExisting !== true) {
        const existing = await reusableCairoJob(route, message.mode);
        if (replacingJob) throw jobRunningError();
        if (existing) return { success: true, jobId: existing.jobId, reused: true };
    }
    if (message.replaceExisting === true) {
        replacingJob = true;
        try {
            await stopAndClearPreviousJobs();
        } catch (error) {
            replacingJob = false;
            throw error;
        }
    } else if (cairoJobRunning || validationRunning || reviewRunning) {
        throw jobRunningError();
    }
    cairoJobRunning = true;
    replacingJob = false;
    const generation = jobGeneration;
    const job = { jobId: crypto.randomUUID(), route, mode: message.mode, state: "preparing", startedAt: Date.now() };
    currentCairoJob = job;
    try {
        currentCairoReady = trackJob((async () => {
            // Keep session snapshots bounded; do not touch normal popup results.
            const saved = await chrome.storage.session.get(null);
            if (generation !== jobGeneration) throw new Error("Assessment job cancelled by user");
            const oldJobs = Object.entries(saved).filter(([key]) => key.startsWith("cairoJob:"))
                .sort((a, b) => (b[1].startedAt || 0) - (a[1].startedAt || 0));
            const expired = oldJobs.filter(([, item], index) => index >= 9 || Date.now() - item.startedAt > 86400000);
            if (expired.length) await chrome.storage.session.remove(expired.map(([key]) => key));
            await writeCairoJob(job);
        })());
        await currentCairoReady;
        if (generation !== jobGeneration) throw new Error("Assessment job cancelled by user");
    } catch (error) {
        if (generation === jobGeneration) cairoJobRunning = false;
        throw error;
    }
    trackJob(processCairoJob(job)).catch(console.error);
    return { success: true, jobId: job.jobId };
}

/*
====================================================
GLOBAL STATE
====================================================
*/

let validationRunning = false;

let reviewRunning = false;

let currentValidationId = null;

let currentReviewId = null;

let cancellationRequested = false;

let reviewCancellationRequested = false;

let validationStartedAt = null;

let reviewStartedAt = null;

const PLUGIN_LAYOUT_STORAGE_KEY = "pluginLayoutMode";

const DEFAULT_PLUGIN_LAYOUT = "side-pane";

const SESSION_RETRY_INTERVAL_MS = 10000;

chrome.storage.local.get(CONFIG.STORAGE_KEYS.DEBUG).then(saved => {
    requestDebugLogging = saved[CONFIG.STORAGE_KEYS.DEBUG] === true;
}).catch(() => {});

chrome.storage.onChanged?.addListener((changes, areaName) => {
    if (areaName === "local" && changes[CONFIG.STORAGE_KEYS.DEBUG]) {
        requestDebugLogging = changes[CONFIG.STORAGE_KEYS.DEBUG].newValue === true;
    }
});

setRequestRecoveryHandlers({
    isDebug: () => requestDebugLogging,
    shouldCancel: () => replacingJob || (validationRunning && !reviewRunning && cancellationRequested) ||
        (reviewRunning && !validationRunning && reviewCancellationRequested),
    onRetry: ({ siteName, attempt, retryInMs }) => trackJob((async () => {
        const generation = jobGeneration;
        if (replacingJob) return;
        const retrySeconds = (retryInMs / 1000).toFixed(retryInMs % 1000 ? 1 : 0);
        const current = `Waiting for ${siteName} data — retry ${attempt}, checking again in ${retrySeconds} seconds`;
        for (const [running, type] of [[validationRunning, "validation"], [reviewRunning, "review"]]) {
            if (!running) continue;
            const key = `${type}Progress`;
            const data = await chrome.storage.local.get(key);
            if (generation !== jobGeneration) return;
            await chrome.storage.local.set({
                [key]: { ...data[key], current },
                [`${type}Status`]: current
            });
        }
    })())
});

async function configurePluginLayout(
    requestedMode
) {

    const mode =
        requestedMode === "side-pane"
            ? "side-pane"
            : "popup";

    await chrome.sidePanel.setOptions({
        path:
            "popup.html?view=side-pane",
        enabled:
            mode === "side-pane"
    });

    await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick:
            mode === "side-pane"
    });

    await chrome.action.setPopup({
        popup:
            mode === "popup"
                ? "popup.html"
                : ""
    });

    await chrome.storage.local.set({
        [PLUGIN_LAYOUT_STORAGE_KEY]:
            mode
    });

    return mode;
}

async function restorePluginLayout() {

    const stored =
        await chrome.storage.local.get(
            PLUGIN_LAYOUT_STORAGE_KEY
        );

    return configurePluginLayout(
        stored[PLUGIN_LAYOUT_STORAGE_KEY] ||
        DEFAULT_PLUGIN_LAYOUT
    );
}

restorePluginLayout().catch(
    error => {

        console.error(
            "Unable to restore plugin layout:",
            error
        );
    }
);

/*
====================================================
HELPERS
====================================================
*/

function createRunId() {

    return `run_${Date.now()}`;
}

async function updateProgress(
    progress
) {

    await chrome.storage.local.set({

        validationProgress:
            progress
    });
}

async function updateStatus(
    status
) {

    await chrome.storage.local.set({

        validationStatus:
            status
    });
}

async function updateError(
    error
) {

    await chrome.storage.local.set({

        validationError:
            error
    });
}

async function updateReviewProgress(
    progress
) {

    await chrome.storage.local.set({

        reviewProgress:
            progress
    });
}

async function updateReviewStatus(
    status
) {

    await chrome.storage.local.set({

        reviewStatus:
            status
    });
}

async function updateReviewError(
    error
) {

    await chrome.storage.local.set({

        reviewError:
            error
    });
}

/*
====================================================
ASSESSMENT REFRESH
====================================================
*/

async function refreshAssessments() {
    try {
        await updateStatus("Loading assessments...");

        const response = await getAssessmentList();

        const items = Array.isArray(response)
            ? response
            : Array.isArray(response?.data)
                ? response.data
                : null;
        if (!items) throw new Error("Cairo assessment list is not a valid array.");

        const normalized = items.map(item => {
            const assessmentId =
                item.incompleteAssessmentId ??
                item.lastAssessmentId;

            return {
                assetId: item.assetId,
                assetName: item.assetName,
                assessmentId,
                lastAssessmentId: item.lastAssessmentId,
                incompleteAssessmentId: item.incompleteAssessmentId,
                surveyCompletedOn: item.surveyCompletedOn,
                dueOn: item.dueOn,
                attestOn: item.attestOn,
                attestName: item.attestName,
                attestId: item.attestId,
                incompleteInitiatedOn: item.incompleteInitiatedOn,
                incompleteInitiatedById: item.incompleteInitiatedById,
                incompleteInitiatedByName: item.incompleteInitiatedByName,
                appMgrName: item.appMgrName,
                sysOwnerName: item.sysOwnerName,
                owningBusUnit: item.owningBusUnit,
                lifeCycle: item.lifeCycle,
                hasIncomplete: Boolean(item.incompleteAssessmentId),
                raw: item
            };
        });

        await saveAssessments(normalized);

        await chrome.storage.local.set({
            assessmentCount: normalized.length,
            lastRefresh: Date.now()
        });

        await updateStatus(
            `Loaded ${normalized.length} assessments`
        );

        return normalized;
    } catch (error) {
        console.error(error);

        await updateError(error.message);

        throw error;
    }
}

/*
====================================================
VALIDATION JOB
====================================================
*/

async function runValidationJob(
    assessments
) {

    if (
        validationRunning || reviewRunning || replacingJob
    ) {

        throw new Error(
            "Another assessment job is running"
        );
    }

    validateJobAssessments(assessments);
    clearCache();

    cancellationRequested = false;
    validationRunning = true;
    runningAssessments.validation = assessments;
    const generation = jobGeneration;

    const failedAssessments = [];

    const contextStore = {};

    currentValidationId =
        createRunId();

    validationStartedAt =
        Date.now();

    try {

        await clearValidationData();
        await chrome.storage.local.set({

            validationComplete:
                false,

            validationResults:
                null,

            validationError:
                null,

            lastAction:
                "validation",

            validationProgress: {
                runId:
                    currentValidationId,

                completed:
                    0,

                total:
                    assessments.length,

                current:
                    "Starting validation",

                startedAt:
                    validationStartedAt
            }
        });

        await updateStatus(
            "Validation started"
        );

        await waitForPrerequisiteSessions({
            assetId: assessments[0]?.assetId,
            jobName:
                "Validation",
            shouldCancel:
                () => cancellationRequested,
            updateJobStatus:
                updateStatus,
            updateJobProgress:
                updateProgress,
            total:
                assessments.length,
            runId:
                currentValidationId,
            startedAt:
                validationStartedAt
        });

        const results =
            await validateBatch(

                assessments,

                trackedProgress(async progress => {
                    if (generation !== jobGeneration) return;

                    const {
                        assessment,
                        result,
                        context,
                        ...progressState
                    } = progress;

                    if (
                        context
                    ) {

                        contextStore[
                            assessment.assessmentId
                        ] = context;
                    }

                    if (
                        result &&
                        result.error
                    ) {

                        failedAssessments.push({

                            ...assessment,

                            assessmentId:
                                assessment.assessmentId,

                            assetName:
                                assessment.assetName,

                            error:
                                result.error
                        });
                    }

                    await updateProgress({

                        runId:
                            currentValidationId,

                        startedAt:
                            validationStartedAt,

                        ...progressState
                    });

                    if (generation !== jobGeneration) return;

                    await updateStatus(

                        `Processing ${progressState.completed}/${progressState.total}`
                    );
                }),

                () => cancellationRequested
            );

        if (generation !== jobGeneration || cancellationRequested) throw new Error("Validation cancelled by user");

        const completedAt = Date.now();
        results.forEach(result => {
            const assessment = assessments.find(item => String(item.assessmentId) === String(result.assessmentId ?? result.assessment?.assessmentId));
            result.completedAt ||= completedAt;
            result.surveyTemplateId ||= assessment?.surveyTemplateId || contextStore[result.assessmentId]?.assessment?.surveyTemplateId || contextStore[result.assessmentId]?.assessment?.surveyTemplate?.surveyTemplateId;
        });
        await saveValidationResults(
            results
        );

        await chrome.storage.local.set({

            validationResults:
                results,

            lastAction:
                "validation",

            failedAssessments,

            assessmentContexts:
                contextStore,

            validationComplete:
                true,

            validationCompletedAt:
                completedAt,

            validationProgress: {
                runId:
                    currentValidationId,

                completed:
                    assessments.length,

                total:
                    assessments.length,

                current:
                    "Validation completed",

                startedAt:
                    validationStartedAt,

                completedAt:
                    completedAt
            }
        });

        await updateStatus(
            "Validation completed"
        );

        return results;

    } catch (error) {

        console.error(error);

        if (generation === jobGeneration) await updateError(
            error.message
        );

        throw error;

    } finally {

        if (generation === jobGeneration) validationRunning = false;
    }
}

/*
====================================================
REVIEW JOB
====================================================
*/

async function runReviewJob(
    assessments,
    reviewConfig = {}
) {

    if (
        reviewRunning || validationRunning || replacingJob
    ) {

        throw new Error(
            "Review already running"
        );
    }

    validateJobAssessments(assessments);
    clearCache();

    reviewCancellationRequested = false;
    reviewRunning = true;
    runningAssessments.review = assessments;
    const generation = jobGeneration;

    currentReviewId =
        createRunId();

    reviewStartedAt =
        Date.now();

    try {

        await clearReviewData();
        await chrome.storage.local.set({

            reviewComplete:
                false,

            reviewResults:
                null,

            reviewError:
                null,

            reviewProgress: {
                runId:
                    currentReviewId,

                completed:
                    0,

                total:
                    assessments.length,

                current:
                    "Starting review",

                startedAt:
                    reviewStartedAt
            },

            lastAction:
                "review"
        });

        await updateReviewStatus(
            "Review started"
        );

        await waitForPrerequisiteSessions({
            assetId: assessments[0]?.assetId,
            jobName:
                "Review",
            shouldCancel:
                () => reviewCancellationRequested,
            updateJobStatus:
                updateReviewStatus,
            updateJobProgress:
                updateReviewProgress,
            total:
                assessments.length,
            runId:
                currentReviewId,
            startedAt:
                reviewStartedAt
        });

        const results =
            await reviewBatch(

                assessments,

                reviewConfig,

                trackedProgress(async progress => {
                    if (generation !== jobGeneration) return;

                    const {
                        assessment,
                        result,
                        ...progressState
                    } = progress;

                    await updateReviewProgress({

                        runId:
                            currentReviewId,

                        startedAt:
                            reviewStartedAt,

                        ...progressState
                    });

                    if (generation !== jobGeneration) return;

                    await updateReviewStatus(

                        `Reviewing ${progressState.completed}/${progressState.total}`
                    );
                }),

                () => reviewCancellationRequested
            );

        if (generation !== jobGeneration || reviewCancellationRequested) throw new Error("Review cancelled by user");
        const completedAt = Date.now();
        results.forEach(result => {
            const assessment = assessments.find(item => String(item.assessmentId) === String(result.assessmentId));
            result.completedAt ||= completedAt;
            result.surveyTemplateId ||= assessment?.surveyTemplateId;
        });
        await saveReviewResults(
            results
        );

        await chrome.storage.local.set({

            reviewResults:
                results,

            reviewComplete:
                true,

            reviewCompletedAt:
                completedAt,

            reviewProgress: {
                runId:
                    currentReviewId,

                completed:
                    assessments.length,

                total:
                    assessments.length,

                current:
                    "Review completed",

                startedAt:
                    reviewStartedAt,

                completedAt:
                    completedAt
            },

            lastAction:
                "review"
        });

        await updateReviewStatus(
            "Review completed"
        );

        return results;

    } catch (error) {

        console.error(error);

        if (generation === jobGeneration) await updateReviewError(
            error.message
        );

        throw error;

    } finally {

        if (generation === jobGeneration) reviewRunning = false;
    }
}

/*
====================================================
CLEAR RESULTS
====================================================
*/

async function clearValidationData() {

    await chrome.storage.local.remove([

        "validationResults",

        CONFIG.STORAGE_KEYS.VALIDATIONS,

        "validationProgress",

        "validationComplete",

        "validationError",

        "validationStatus",
        "validationCompletedAt",

        "failedAssessments",

        "assessmentContexts"
    ]);
}

async function clearReviewData() {

    await chrome.storage.local.remove([

        "reviewResults",

        CONFIG.STORAGE_KEYS.REVIEWS,

        "reviewProgress",

        "reviewComplete",

        "reviewError",

        "reviewStatus",
        "reviewCompletedAt"
    ]);
}


async function checkPrerequisite(
    check,
    assetId,
    requestId = "prerequisite-check"
) {
    let finalUrl = check.url;
    try {

        if (check.id === "cairo") {
            const assessments = await fetchJson(check.url, { useCache: false, retryUntilAvailable: false, retries: 1 });
            const probeAssetId = (Array.isArray(assessments) ? assessments : [])
                .find(item => /^[1-9]\d*$/.test(String(item?.assetId ?? "")))?.assetId;
            return { id: check.id, name: check.name, passed: true, status: 200, finalUrl: check.url,
                openedTab: false, mode: "direct-cookies", probeAssetId,
                message: "Cairo data is accessible directly with cookies; no Cairo tab was used" };
        }

        if (check.id === "gtc") {
            const probe = await probeDirectEndpoint(check.id, check.url);
            return { id: check.id, name: check.name, passed: true, status: probe.status, finalUrl: check.url,
                openedTab: false, mode: "direct", message: "GTC is accessible directly; no GTC tab or sign-in was used" };
        }

        if (check.id === "esats" && assetId) {
            const url = URLS.ESATS_CONTACT_DETAILS_SUMMARY.replace("{assetId}", encodeURIComponent(assetId));
            finalUrl = url;
            await fetchJson(url, { useCache: false, retryUntilAvailable: false, retries: 1 });
            return { id: check.id, name: check.name, passed: true, status: 200,
                finalUrl: url, openedTab: false, mode: "bearer-with-fallback",
                message: "ESATS token-backed data is accessible (direct bearer token is preferred; existing tab flow remains the fallback)" };
        }

        await probeSiteSession(check.id, check.url);
        return { id: check.id, name: check.name, passed: true, status: 200,
            finalUrl: check.url, openedTab: false, mode: "tab-fallback",
            message: "ESATS fallback session is active; a data endpoint will test the bearer token when an asset is available" };

    } catch (error) {
        const waitingForEsats = check.id === "esats" && /(?:sign-in|bearer token|waiting)/i.test(error.message);
        console.error(`[Risk Profiler][Prerequisite][${check.name}] Check failed.`, {
            requestId,
            endpoint: endpointTemplate(finalUrl),
            assetIdPresent: Boolean(assetId),
            error: waitingForEsats ? "Waiting for ESATS sign-in/token" : error.message
        });
        return {

            id:
                check.id,

            name:
                check.name,

            passed:
                false,

            status:
                null,

            finalUrl:
                finalUrl,

            openedTab:
                false,

            message:
                waitingForEsats ? "Waiting for ESATS sign-in/token" : error.message
        };
    }
}

async function runPrerequisiteChecks(previousChecks = [], assetId, checkId = "prerequisite-check") {
    const generation = jobGeneration;
    const startedAt = Date.now();
    const checkById = new Map(PREREQUISITE_CHECKS.map(check => [check.id, check]));
    const previousCairo = previousChecks.find(previous => previous.id === "cairo" && previous.passed);
    const cairo = previousCairo || await checkPrerequisite(checkById.get("cairo"), assetId, checkId);
    const probeAssetId = assetId || cairo.probeAssetId;
    const remaining = await Promise.all(["esats", "gtc"].map(id =>
        previousChecks.find(previous => previous.id === id && previous.passed) ||
        checkPrerequisite(checkById.get(id), probeAssetId, checkId)
    ));
    const checks = [cairo, ...remaining];

    const result = {

        passed:
            checks.every(
                check =>
                    check.passed
            ),

        checkedAt:
            Date.now(),

        checks
    };

    if (generation === jobGeneration) await chrome.storage.local.set({ prerequisiteStatus: result });

    console.info("[Risk Profiler][Prerequisites] Check completed.", {
        requestId: checkId,
        durationMs: Date.now() - startedAt,
        passed: result.passed,
        checks: checks.map(check => ({ id: check.id, passed: check.passed, mode: check.mode || null }))
    });

    return result;
}

async function checkPrerequisites(previousChecks = [], assetId, options = {}) {
    const force = options.force === true || previousChecks.length > 0 || Boolean(assetId);
    if (prerequisiteCheckInFlight) return prerequisiteCheckInFlight;

    const work = (async () => {
        if (!force) {
            const saved = await chrome.storage.local.get("prerequisiteStatus");
            const cached = saved.prerequisiteStatus;
            if (cached?.checkedAt && Date.now() - cached.checkedAt < PREREQUISITE_FRESHNESS_MS) {
                console.info("[Risk Profiler][Prerequisites] Reused a recent check.", {
                    requestId: options.requestId || "prerequisite-cache",
                    ageMs: Date.now() - cached.checkedAt,
                    passed: cached.passed
                });
                return { ...cached, reused: true };
            }
        }

        const checkId = options.requestId || `prerequisite-${Date.now().toString(36)}`;
        return runPrerequisiteChecks(previousChecks, assetId, checkId);
    })();
    const shared = work.finally(() => {
        if (prerequisiteCheckInFlight === shared) prerequisiteCheckInFlight = null;
    });
    prerequisiteCheckInFlight = shared;
    return shared;
}

async function recheckEsatsAfterTabLoad() {
    const saved = await chrome.storage.local.get([
        "prerequisiteStatus",
        CONFIG.STORAGE_KEYS.ASSESSMENTS
    ]);
    const previous = saved.prerequisiteStatus?.checks || [];
    const esats = previous.find(check => check.id === "esats");
    if (!esats || esats.passed) return;
    const assetId = previous.find(check => check.id === "cairo")?.probeAssetId ||
        saved[CONFIG.STORAGE_KEYS.ASSESSMENTS]?.find(item => /^[1-9]\d*$/.test(String(item?.assetId ?? "")))?.assetId;
    await checkPrerequisites(previous, assetId, {
        force: true,
        requestId: `esats-tab-${Date.now().toString(36)}`
    });
}

function delay(
    milliseconds
) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                milliseconds
            )
    );
}

async function waitForPrerequisiteSessions({
    assetId,
    jobName,
    shouldCancel,
    updateJobStatus,
    updateJobProgress,
    total,
    runId,
    startedAt
}) {

    let previousChecks = [];
    let attempt = 0;
    const stopSignal = jobStopController.signal;

    while (
        true
    ) {

        if (
            shouldCancel()
        ) {

            throw new Error(
                `${jobName} cancelled by user`
            );
        }

        const prerequisites =
            await interruptible(checkPrerequisites(previousChecks, assetId, { force: true }), stopSignal);
        previousChecks = prerequisites.checks;
        attempt++;

        if (
            prerequisites.passed
        ) {

            await updateJobStatus(
                "All prerequisite data sources are accessible"
            );

            return;
        }

        const waitingFor =
            prerequisites.checks
                .filter(
                    check =>
                        !check.passed
                )
                .map(
                    check =>
                        check.name
                )
                .join(
                    ", "
                );

        const waitingMessage =
            `Waiting for sign-in/data: ${waitingFor} — check ${attempt}; retrying in 10 seconds`;

        await updateJobStatus(
            waitingMessage
        );

        await updateJobProgress({
            runId,
            completed:
                0,
            total,
            current:
                waitingMessage,
            startedAt
        });

        await interruptible(delay(SESSION_RETRY_INTERVAL_MS), stopSignal);
    }
}

/*
====================================================
GET STATUS
====================================================
*/

async function getWorkerStatus() {

    return {

        validationRunning,

        reviewRunning,

        currentValidationId,

        currentReviewId,

        lastRefresh:
            await getValue(
                "lastRefresh"
            )
    };
}

/*
====================================================
MESSAGE HANDLER
====================================================
*/

chrome.runtime.onMessage.addListener(

    (
        message,
        sender,
        sendResponse
    ) => {

        (
            async () => {

                try {

                    if (!message || typeof message.action !== "string") throw new Error("Invalid plugin message.");

                    if (["CAIRO_SURVEY_ELIGIBILITY", "START_CAIRO_JOB", "GET_CAIRO_JOB"].includes(message.action)) {
                        sendResponse(await handleCairoMessage(message, sender));
                        return;
                    }

                    if (!isPluginPage(sender)) throw new Error("This action is only available in the plugin UI.");

                    switch (
                        message.action
                    ) {

                        case "REFRESH_ASSESSMENTS":

                            const assessments =
                                await refreshAssessments();

                            try {
                                await getCairoTemplates(true);
                            } catch (error) {
                                // Keep the last supported-template cache when Cairo's
                                // template endpoint is temporarily unavailable.
                                console.error("Survey template refresh error:", error);
                            }

                            sendResponse({

                                success: true,

                                count:
                                    assessments.length
                            });

                            break;

                        case "START_VALIDATION":

                            if (cairoJobRunning || replacingJob || validationRunning || reviewRunning) throw jobRunningError();
                            validateJobAssessments(message.assessments);

                            trackJob(runValidationJob(

                                message.assessments
                            )).catch(error => {

                                console.error(
                                    error
                                );
                            });

                            sendResponse({

                                success: true,

                                started: true
                            });

                            break;

                        case "START_REVIEW":

                            if (cairoJobRunning || replacingJob || validationRunning || reviewRunning) throw jobRunningError();
                            validateJobAssessments(message.assessments);

                            trackJob(runReviewJob(

                                message.assessments,

                                message.reviewConfig || {}
                            )).catch(error => {

                                console.error(
                                    error
                                );
                            });

                            sendResponse({

                                success: true,

                                started: true
                            });

                            break;

                        case "GET_STATUS":

                            sendResponse({

                                success: true,

                                status:
                                    await getWorkerStatus()
                            });

                            break;

                        case "CHECK_PREREQUISITES":

                            sendResponse({

                                success: true,

                                prerequisites:
                                    await checkPrerequisites([], undefined, {
                                        force: message.force === true,
                                        requestId: typeof message.requestId === "string" ? message.requestId : undefined
                                    })
                            });

                            break;

                        case "STOP_VALIDATION":
                            await forceStopJobs();

                            sendResponse({
                                success:true
                            });

                            break;

                        case "SET_PLUGIN_LAYOUT":

                            sendResponse({
                                success:
                                    true,
                                mode:
                                    await configurePluginLayout(
                                        message.mode
                                    )
                            });

                            break;

                        case "STOP_REVIEW":
                            await forceStopJobs();

                            sendResponse({
                                success:true
                            });

                            break;

                        case "CLEAR_RESULTS":
                            await clearIdleResults(clearValidationData);

                            sendResponse({

                                success: true
                            });

                            break;

                        case "CLEAR_REVIEW_RESULTS":
                            await clearIdleResults(clearReviewData);

                            sendResponse({

                                success: true
                            });

                            break;

                        default:

                            sendResponse({

                                success: false,

                                error:
                                    "Unknown action"
                            });
                    }

                } catch (error) {

                    sendResponse({

                        success: false,

                        error:
                            error.message,
                        code: error.code || null
                    });
                }

            }
        )();

        return true;
    }
);

const LEGACY_ASSESSMENT_REFRESH_ALARM = "assessment_refresh";
const SURVEY_TEMPLATE_REFRESH_ALARM = "survey_template_refresh";
const SURVEY_TEMPLATE_REFRESH_MINUTES = 60;

async function scheduleSurveyTemplateRefresh() {
    await chrome.alarms.create(
        SURVEY_TEMPLATE_REFRESH_ALARM,
        {
            delayInMinutes: SURVEY_TEMPLATE_REFRESH_MINUTES,
            periodInMinutes: SURVEY_TEMPLATE_REFRESH_MINUTES
        }
    );
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete" || !tab?.url?.startsWith("https://esats.web.boeing.com/")) return;
    trackJob(recheckEsatsAfterTabLoad()).catch(error => {
        console.warn("[Risk Profiler][ESATS] Automatic prerequisite recheck after tab load failed.", {
            tabId,
            error: error.message
        });
    });
});

chrome.runtime.onInstalled.addListener(
    async () => {

        await restorePluginLayout();
        // Earlier releases scheduled background assessment refreshes. Remove
        // that persisted alarm so installing/updating never opens site tabs.
        await chrome.alarms.clear(
            LEGACY_ASSESSMENT_REFRESH_ALARM
        );
        await scheduleSurveyTemplateRefresh();
    }
);

chrome.runtime.onStartup.addListener(
    async () => {

        await restorePluginLayout();
        await chrome.alarms.clear(
            LEGACY_ASSESSMENT_REFRESH_ALARM
        );
        await scheduleSurveyTemplateRefresh();
    }
);

chrome.alarms.onAlarm.addListener(

    async alarm => {

        if (alarm.name === LEGACY_ASSESSMENT_REFRESH_ALARM) {
            await chrome.alarms.clear(
                LEGACY_ASSESSMENT_REFRESH_ALARM
            );
        } else if (alarm.name === SURVEY_TEMPLATE_REFRESH_ALARM) {
            await refreshCairoTemplatesIfOpen();
        }
    }
);
