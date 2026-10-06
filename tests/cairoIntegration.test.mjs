import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { webcrypto } from "node:crypto";
import { CONFIG, PREREQUISITE_CHECKS } from "../utils/constants.js";
import { parseCairoSurveyUrl, isSupportedCairoSurvey, resolveCairoAssessment } from "../core/cairoIntegration.js";

const routeUrl = "https://cairois.web.boeing.com/Assessments/41559874/Survey/616901";
const route = parseCairoSurveyUrl(routeUrl);
const templates = [{ surveyTemplateId: 616901, versionNumber: 312, deactivatedOn: "2026-09-25" }];
const row = { assetId: "40326", assetName: "Test application", incompleteAssessmentId: 41559874, lastAssessmentId: 26750839 };
const withoutImports = source => source.replace(/import\s+[\s\S]*?\sfrom\s*["'][^"']+["'];/g, "");
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise(resolve => setImmediate(resolve)); };

test("matches static Cairo route with dynamic IDs and optional query/hash", () => {
    assert.deepEqual(route, { assessmentId: "41559874", surveyTemplateId: "616901" });
    assert.deepEqual(parseCairoSurveyUrl(routeUrl + "/?x=1#question"), route);
    assert.deepEqual(parseCairoSurveyUrl("https://cairois.web.boeing.com/Assessments/99/Survey/888"), { assessmentId: "99", surveyTemplateId: "888" });
});

test("rejects wrong origin, malformed IDs, and non-survey routes", () => {
    for (const url of ["invalid", routeUrl.replace("https:", "http:"), routeUrl.replace("cairois.web.boeing.com", "other.example"), routeUrl + "/extra", routeUrl.replace("41559874", "0"), routeUrl.replace("616901", "text"), routeUrl.replace("Assessments", "Assets")]) {
        assert.equal(parseCairoSurveyUrl(url), null, url);
    }
});

test("historical supported templates are eligible; unknown IDs fail closed", () => {
    assert.equal(isSupportedCairoSurvey(route, templates), true);
    assert.equal(isSupportedCairoSurvey({ ...route, surveyTemplateId: "123" }, templates), false);
    assert.equal(isSupportedCairoSurvey(null, templates), false);
    assert.equal(isSupportedCairoSurvey(route, null), false);
});

test("resolves incomplete primary assessment and verifies its actual template", () => {
    const resolved = resolveCairoAssessment(route, [row], { surveyTemplateId: 616901 });
    assert.equal(resolved.assessmentId, 41559874);
    assert.equal(resolved.lastAssessmentId, 26750839);
    assert.equal(resolved.surveyTemplateId, 616901);
    assert.throws(() => resolveCairoAssessment(route, [], { surveyTemplateId: 616901 }), /primary assessment list/);
    assert.throws(() => resolveCairoAssessment(route, [{ ...row, incompleteAssessmentId: null, lastAssessmentId: 41559874 }], { surveyTemplateId: 616901 }), /incomplete assessment/);
    assert.throws(() => resolveCairoAssessment(route, [row], { surveyTemplateId: 123 }), /does not match/);
});

function storageArea() {
    const values = {};
    return {
        values,
        async get(keys) {
            if (keys === null) return structuredClone(values);
            return structuredClone(Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, values[key]])));
        },
        async set(patch) { Object.assign(values, structuredClone(patch)); },
        async remove(keys) { for (const key of Array.isArray(keys) ? keys : [keys]) delete values[key]; }
    };
}

async function workerHarness({ templateError = false, detailId = 616901 } = {}) {
    const local = storageArea();
    const session = storageArea();
    const listeners = {};
    const event = name => ({ addListener: callback => { listeners[name] = callback; } });
    const calls = [];
    let releaseSession;
    const sessionReady = new Promise(resolve => { releaseSession = resolve; });
    const chrome = {
        storage: { local, session },
        runtime: { id: "test-extension", getURL: file => `chrome-extension://test-extension/${file}`, onMessage: event("message"), onInstalled: event("installed"), onStartup: event("startup") },
        tabs: { get: async () => ({ id: 1, url: routeUrl }) },
        sidePanel: { setOptions: async () => {}, setPanelBehavior: async () => {} },
        action: { setPopup: async () => {} },
        alarms: { onAlarm: event("alarm"), create() {} }
    };
    const context = vm.createContext({
        chrome, CONFIG, PREREQUISITE_CHECKS, URL, AbortController, crypto: webcrypto, console,
        parseCairoSurveyUrl, isSupportedCairoSurvey, resolveCairoAssessment,
        setInterval() {}, setTimeout, sessionReady,
        setRequestRecoveryHandlers() {},
        rememberSiteTab() {},
        ensureSiteTab: async () => ({ id: 1, status: "complete", url: routeUrl }),
        probeSiteSession: async () => ({ sessionActive: true }),
        cancelPendingRequests() {},
        clearCache() {},
        getValue: async key => local.values[key],
        setValue: async (key, value) => local.set({ [key]: value }),
        getAssessmentList: async () => [row],
        getAssessmentDetail: async () => ({ surveyTemplateId: detailId }),
        getRiskProfilerSurveyTemplates: async () => { if (templateError) throw new Error("offline"); return templates; },
        saveAssessments: async data => local.set({ assessments: data }),
        saveValidationResults: async data => local.set({ validations: data }),
        saveReviewResults: async data => local.set({ reviews: data }),
        validateBatch: async assessments => { calls.push({ mode: "validation", assessments }); return [{ assessment: assessments[0], results: [] }]; },
        reviewBatch: async (assessments, config, progress, shouldCancel) => {
            calls.push({ mode: "review", assessments, config });
            return [{ assessmentId: assessments[0].assessmentId, assetName: row.assetName, workQueue: [] }];
        }
    });
    vm.runInContext(withoutImports(await readFile(new URL("../service_worker.js", import.meta.url), "utf8")), context);
    const waitForSessions = context.waitForPrerequisiteSessions;
    vm.runInContext("waitForPrerequisiteSessions = async () => { await interruptible(sessionReady, jobStopController.signal); };", context);
    const sender = { id: chrome.runtime.id, tab: { id: 1 }, frameId: 0, url: routeUrl };
    const viewSender = { id: chrome.runtime.id, url: chrome.runtime.getURL("popup.html") + "?view=cairo&job=test" };
    const send = (message, from = ["CAIRO_SURVEY_ELIGIBILITY", "START_CAIRO_JOB"].includes(message.action) ? sender : viewSender) =>
        new Promise(resolve => listeners.message(message, from, resolve));
    return { send, sender, viewSender, local, session, chrome, context, calls, releaseSession, waitForSessions };
}

test("session waiting retries only failed sites at ten-second intervals", async () => {
    const h = await workerHarness();
    const attempts = { cairo: 0, esats: 0, gtc: 0 };
    const delays = [];
    const messages = [];
    h.context.checkPrerequisite = async check => {
        attempts[check.id]++;
        return { id: check.id, name: check.name, passed: check.id !== "esats" || attempts.esats >= 3 };
    };
    h.context.delay = async ms => { delays.push(ms); };
    await h.waitForSessions({ assetId: "40326", jobName: "Validation", shouldCancel: () => false,
        updateJobStatus: async message => messages.push(message), updateJobProgress: async () => {},
        total: 1, runId: "test", startedAt: 1 });
    assert.deepEqual(attempts, { cairo: 1, esats: 3, gtc: 1 });
    assert.deepEqual(delays, [10000, 10000]);
    assert.match(messages[0], /ESATS.*check 1.*10 seconds/);
    assert.match(messages[1], /ESATS.*check 2.*10 seconds/);
    assert.equal(messages.at(-1), "All prerequisite sessions are active");
});

test("ESATS readiness probes the asset data endpoint rather than the gateway root", async () => {
    const h = await workerHarness();
    h.chrome.tabs.query = async () => [{ id: 1, status: "complete", url: "https://esats.web.boeing.com/" }];
    const probes = [];
    h.context.fetchJson = async (url, options) => { probes.push({ url, options }); return { businessApplicationVersions: [] }; };
    const result = await h.context.checkPrerequisite(PREREQUISITE_CHECKS.find(check => check.id === "esats"), "40326");
    assert.equal(result.passed, true);
    assert.match(probes[0].url, /GetBusinessApplicationVersions\?esatsId=40326$/);
    assert.equal(probes[0].options.retryUntilAvailable, false);
    assert.equal(probes[0].options.refreshCache, true);
    assert.equal(probes[0].options.retries, 1);
});

test("session checks use shared tab recovery and session probes for GTC and ESATS without an asset", async () => {
    const h = await workerHarness();
    const ensured = [];
    const probed = [];
    h.context.ensureSiteTab = async id => { ensured.push(id); return { id: 8, status: "complete" }; };
    h.context.probeSiteSession = async (id, url) => { probed.push({ id, url }); };
    for (const id of ["esats", "gtc"]) {
        const check = PREREQUISITE_CHECKS.find(item => item.id === id);
        assert.equal((await h.context.checkPrerequisite(check)).passed, true);
        assert.equal(probed.at(-1).url, id === "esats" ? check.openUrl : check.url);
    }
    assert.deepEqual(ensured, ["esats", "gtc"]);
    assert.deepEqual(probed.map(item => item.id), ["esats", "gtc"]);
});

test("background start succeeds without a popup and waits for sessions before validation", async () => {
    const h = await workerHarness();
    const start = await h.send({ action: "START_CAIRO_JOB", mode: "validation" });
    assert.equal(start.success, true);
    await flush();
    let status = await h.send({ action: "GET_CAIRO_JOB", jobId: start.jobId }, h.viewSender);
    assert.equal(status.job.state, "running");
    assert.equal(h.calls.length, 0);
    assert.equal((await h.send({ action: "START_CAIRO_JOB", mode: "review" })).success, false);
    assert.equal((await h.send({ action: "START_REVIEW", assessments: [row] })).success, false);
    h.releaseSession();
    await flush();
    status = await h.send({ action: "GET_CAIRO_JOB", jobId: start.jobId }, h.viewSender);
    assert.equal(status.job.state, "complete");
    assert.equal(status.job.results[0].assessment.assessmentId, 41559874);
    await h.local.set({ validationResults: [{ assessment: { assessmentId: 999 } }] });
    const snapshot = await h.send({ action: "GET_CAIRO_JOB", jobId: start.jobId }, h.viewSender);
    assert.equal(snapshot.job.results[0].assessment.assessmentId, 41559874);
});

test("popup starts reject duplicate and overlapping validation/review jobs", async () => {
    const h = await workerHarness();
    h.context.console = { ...console, error() {} };
    const assessments = [{ ...row, assessmentId: row.incompleteAssessmentId }];
    assert.equal((await h.send({ action: "START_VALIDATION", assessments }, h.viewSender)).success, true);
    for (const action of ["START_VALIDATION", "START_REVIEW"]) {
        const response = await h.send({ action, assessments }, h.viewSender);
        assert.equal(response.success, false);
        assert.equal(response.code, "JOB_RUNNING");
    }
    h.releaseSession();
    await flush();
    assert.equal(h.calls.length, 1);
});

test("invalid popup start payloads do not reserve a job or report started", async () => {
    const h = await workerHarness();
    h.context.console = { ...console, error() {} };
    for (const assessments of [undefined, [], [{}], [{ assetName: "Test", assetId: 1, assessmentId: "invalid" }]]) {
        assert.equal((await h.send({ action: "START_VALIDATION", assessments }, h.viewSender)).success, false);
    }
    assert.equal((await h.send({ action: "GET_STATUS" }, h.viewSender)).status.validationRunning, false);
});

test("Cairo content scripts cannot use privileged popup stop/clear commands", async () => {
    const h = await workerHarness();
    await h.local.set({ validationResults: ["keep"] });
    for (const action of ["STOP_VALIDATION", "CLEAR_RESULTS", "SET_PLUGIN_LAYOUT"]) {
        assert.equal((await h.send({ action }, h.sender)).success, false);
    }
    assert.deepEqual(h.local.values.validationResults, ["keep"]);
});

test("review uses the saved review mode and the same background engine", async () => {
    const h = await workerHarness();
    await h.local.set({ reviewMode: "selectedAnswers" });
    const start = await h.send({ action: "START_CAIRO_JOB", mode: "review" });
    h.releaseSession();
    await flush();
    const status = await h.send({ action: "GET_CAIRO_JOB", jobId: start.jobId }, h.viewSender);
    assert.equal(status.job.state, "complete");
    assert.equal(h.calls[0].config.mode, "selectedAnswers");
    assert.equal(status.job.results[0].assessmentId, 41559874);
});

test("background rejects unauthorized frames, navigation races, and invalid modes", async () => {
    const h = await workerHarness();
    for (const sender of [{ ...h.sender, id: "other" }, { ...h.sender, frameId: 2 }, { ...h.sender, url: routeUrl.replace("616901", "123") }]) {
        assert.equal((await h.send({ action: "CAIRO_SURVEY_ELIGIBILITY" }, sender)).success, false);
    }
    assert.equal((await h.send({ action: "START_CAIRO_JOB", mode: "delete" })).success, false);
    assert.equal((await h.send({ action: "GET_CAIRO_JOB", jobId: "bad" }, h.viewSender)).success, false);
    assert.equal((await h.send({ action: "GET_CAIRO_JOB", jobId: webcrypto.randomUUID() })).success, false);
});

test("template mismatch produces a visible error without running the engines", async () => {
    const h = await workerHarness({ detailId: 123 });
    const start = await h.send({ action: "START_CAIRO_JOB", mode: "validation" });
    await flush();
    const status = await h.send({ action: "GET_CAIRO_JOB", jobId: start.jobId }, h.viewSender);
    assert.equal(status.job.state, "error");
    assert.match(status.job.error, /does not match/);
    assert.equal(h.calls.length, 0);
});

test("eligibility falls back to the What's New list when the template request fails", async () => {
    const h = await workerHarness({ templateError: true });
    assert.equal((await h.send({ action: "CAIRO_SURVEY_ELIGIBILITY" })).success, false);
    await h.local.set({ whatsNewModalState: { templates } });
    assert.equal((await h.send({ action: "CAIRO_SURVEY_ELIGIBILITY" })).eligible, true);
});

test("interrupted worker state is reported rather than leaving the modal stuck", async () => {
    const h = await workerHarness();
    const jobId = webcrypto.randomUUID();
    await h.session.set({ [`cairoJob:${jobId}`]: { jobId, mode: "review", state: "running" } });
    const status = await h.send({ action: "GET_CAIRO_JOB", jobId }, h.viewSender);
    assert.equal(status.job.state, "error");
    assert.match(status.job.error, /restarted/);
});

class Element {
    constructor(tag) {
        this.tagName = tag; this.children = []; this.listeners = {}; this.className = ""; this.attributes = {};
        const priorities = {};
        this.style = {
            setProperty(key, value, priority = "") { this[key] = value; priorities[key] = priority; },
            getPropertyValue(key) { return this[key] || ""; },
            getPropertyPriority(key) { return priorities[key] || ""; },
            removeProperty(key) { delete this[key]; delete priorities[key]; }
        };
    }
    contains(element) { return this === element || this.children.some(child => child.contains(element)); }
    set textContent(value) { this.text = value; }
    get textContent() { return this.text || this.children.map(child => child.textContent).join(""); }
    setAttribute(key, value) { this.attributes[key] = value; }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    append(...elements) { for (const element of elements) { element.remove(); element.parentElement = this; this.children.push(element); } }
    remove() { if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this); this.parentElement = null; }
    before(element) { element.remove(); const parent = this.parentElement; const index = parent.children.indexOf(this); element.parentElement = parent; parent.children.splice(index, 0, element); }
    replaceWith(element) { this.before(element); this.remove(); }
    get nextSibling() { return this.parentElement?.children[this.parentElement.children.indexOf(this) + 1]; }
    focus() { this.focused = true; }
    showModal() { this.open = true; }
}

async function contentHarness(eligible = true, headerWidths = null, startResponses = []) {
    const body = new Element("body");
    const outline = new Element("button");
    outline.textContent = "View Survey Outline";
    outline.className = "btn btn-default";
    body.append(outline);
    let actionsColumn;
    let titleColumn;
    if (headerWidths) {
        const header = new Element("div");
        actionsColumn = new Element("div");
        titleColumn = new Element("div");
        actionsColumn.style.width = headerWidths[0];
        titleColumn.style.width = headerWidths[1];
        actionsColumn.append(outline);
        header.append(titleColumn, actionsColumn);
        body.append(header);
    }
    const walk = root => [root, ...root.children.flatMap(walk)];
    const document = {
        body, documentElement: body,
        createElement: tag => new Element(tag),
        getElementById: id => walk(body).find(element => element.id === id),
        querySelectorAll: () => walk(body).filter(element => ["button", "a", "input"].includes(element.tagName))
    };
    const location = { href: routeUrl, pathname: new URL(routeUrl).pathname };
    const calls = [];
    let reconcile;
    const context = vm.createContext({
        document, location, setTimeout() {}, setInterval(callback) { reconcile = callback; },
        getComputedStyle: element => ({ width: element.style.width || "auto" }),
        MutationObserver: class { observe() {} },
        chrome: { runtime: { getURL: path => `chrome-extension://test/${path}`, async sendMessage(message) { calls.push(message); return message.action === "CAIRO_SURVEY_ELIGIBILITY" ? { success: true, eligible } : startResponses.shift() || { success: true, jobId: "test-job" }; } } }
    });
    vm.runInContext(await readFile(new URL("../content/cairoSurvey.js", import.meta.url), "utf8"), context);
    await flush();
    return { body, outline, document, calls, location, reconcile, actionsColumn, titleColumn };
}

test("survey header swaps 40/60 widths and restores them when navigating away", async () => {
    for (const original of [["40%", "60%"], ["400px", "600px"]]) {
        const h = await contentHarness(true, original);
        assert.equal(h.actionsColumn.style.width, "60%");
        assert.equal(h.titleColumn.style.width, "40%");
        await h.reconcile();
        assert.equal(h.actionsColumn.style.width, "60%");
        h.location.href = "https://cairois.web.boeing.com/Assets/40326";
        h.location.pathname = "/Assets/40326";
        await h.reconcile();
        assert.equal(h.actionsColumn.style.width, original[0]);
        assert.equal(h.titleColumn.style.width, original[1]);
        assert.equal(h.actionsColumn.style.getPropertyPriority("width"), "");
    }
});

test("header widths stay unchanged on unsupported surveys or unrelated layouts", async () => {
    const unsupported = await contentHarness(false, ["40%", "60%"]);
    assert.equal(unsupported.actionsColumn.style.width, "40%");
    assert.equal(unsupported.titleColumn.style.width, "60%");
    const unrelated = await contentHarness(true, ["50%", "50%"]);
    assert.equal(unrelated.actionsColumn.style.width, "50%");
    assert.equal(unrelated.titleColumn.style.width, "50%");
});

test("content injects two buttons immediately before outline without duplication", async () => {
    const h = await contentHarness();
    const actions = h.document.getElementById("risk-profiler-cairo-actions");
    assert.equal(actions.nextSibling, h.outline);
    assert.deepEqual(actions.children.map(button => button.textContent), ["Plugin - Validate", "Plugin - Review"]);
    await h.reconcile();
    assert.equal(h.body.children.length, 2);
    await actions.children[0].listeners.click({ preventDefault() {} });
    await flush();
    assert.equal(h.calls.at(-1).action, "START_CAIRO_JOB");
    assert.equal(h.calls.at(-1).mode, "validation");
    const dialog = h.body.children.find(element => element.tagName === "dialog");
    assert.equal(dialog.open, true);
    assert.match(dialog.children[1].src, /popup.html\?view=cairo&job=test-job$/);
    dialog.children[0].children[1].listeners.click();
    assert.equal(h.body.children.includes(dialog), false);
    assert.equal(h.calls.some(call => call.action.startsWith("STOP")), false);
});

test("Cairo busy warning offers cancellation and starts the originally requested mode", async () => {
    for (const [index, mode] of [[0, "validation"], [1, "review"]]) {
        const h = await contentHarness(true, null, [{ success: false, code: "JOB_RUNNING", error: "Another assessment job is running." }]);
        const actions = h.document.getElementById("risk-profiler-cairo-actions");
        actions.children[index].listeners.click({ preventDefault() {} });
        await flush();
        const dialog = h.body.children.find(element => element.tagName === "dialog");
        const replace = dialog.children.find(element => element.textContent === "Cancel and start current app");
        assert.ok(replace);
        assert.equal(h.calls.at(-1).replaceExisting, false);
        await replace.listeners.click();
        assert.equal(h.calls.at(-1).replaceExisting, true);
        assert.equal(h.calls.at(-1).mode, mode);
        assert.match(dialog.children[1].src, /popup.html\?view=cairo&job=test-job$/);
        assert.equal(dialog.children.includes(replace), false);
    }
});

test("ordinary Cairo startup errors do not offer a destructive replacement button", async () => {
    const h = await contentHarness(true, null, [{ success: false, error: "Unsupported template." }]);
    h.document.getElementById("risk-profiler-cairo-actions").children[0].listeners.click({ preventDefault() {} });
    await flush();
    const dialog = h.body.children.find(element => element.tagName === "dialog");
    assert.equal(dialog.children.length, 2);
    assert.equal(dialog.children[1].textContent, "Unsupported template.");
});

test("replacement stops an old Cairo job, clears its run data, and starts the current app", async () => {
    const h = await workerHarness();
    h.context.console = { ...console, error() {} };
    await h.local.set({ asaSettings: { enabled: true }, reviewQuestionNotes: { saved: "keep" }, reviewMode: "selectedAnswers" });
    const old = await h.send({ action: "START_CAIRO_JOB", mode: "validation" });
    await flush();
    await h.local.set({ validationResults: [{ assessmentId: 999 }], validations: ["old"],
        assessmentContexts: { 999: {} }, failedAssessments: [{ assessmentId: 999 }],
        reviewResults: ["old"], reviews: ["old"], validationCompletedAt: 1 });
    const next = { ...row, assetId: "40327", assetName: "Current application", incompleteAssessmentId: 55 };
    const nextUrl = routeUrl.replace("41559874", "55");
    h.chrome.tabs.get = async () => ({ id: 1, url: nextUrl });
    h.context.getAssessmentList = async () => [row, next];
    let cancelledRequests = 0;
    h.context.cancelPendingRequests = () => { cancelledRequests++; };
    const response = await h.send({ action: "START_CAIRO_JOB", mode: "review", replaceExisting: true }, { ...h.sender, url: nextUrl });
    assert.equal(response.success, true);
    assert.equal(cancelledRequests, 1);
    assert.equal(h.session.values[`cairoJob:${old.jobId}`], undefined);
    assert.equal(h.local.values.validationResults, undefined);
    assert.equal(h.local.values.validations, undefined);
    assert.equal(h.local.values.assessmentContexts, undefined);
    assert.equal(h.local.values.failedAssessments, undefined);
    assert.equal(h.local.values.validationCompletedAt, undefined);
    assert.deepEqual(h.local.values.asaSettings, { enabled: true });
    assert.deepEqual(h.local.values.reviewQuestionNotes, { saved: "keep" });
    h.releaseSession();
    await flush();
    const result = await h.send({ action: "GET_CAIRO_JOB", jobId: response.jobId }, h.viewSender);
    assert.equal(result.job.state, "complete");
    assert.equal(result.job.results[0].assessmentId, 55);
    assert.equal(h.calls.length, 1, "the cancelled validation engine never starts");
    assert.equal(h.calls[0].mode, "review");
    assert.equal(h.calls[0].config.mode, "selectedAnswers");
});

test("replacement can stop a popup job and rejects concurrent replacement clicks", async () => {
    const h = await workerHarness();
    h.context.console = { ...console, error() {} };
    assert.equal((await h.send({ action: "START_VALIDATION", assessments: [{ ...row, assessmentId: row.incompleteAssessmentId }] })).success, true);
    await flush();
    const busy = await h.send({ action: "START_CAIRO_JOB", mode: "review" });
    assert.equal(busy.code, "JOB_RUNNING");
    const [first, second] = await Promise.all([
        h.send({ action: "START_CAIRO_JOB", mode: "review", replaceExisting: true }),
        h.send({ action: "START_CAIRO_JOB", mode: "review", replaceExisting: true })
    ]);
    assert.equal(first.success, true);
    assert.equal(second.success, false);
    assert.equal(second.code, "JOB_RUNNING");
    h.releaseSession();
    await flush();
    assert.equal(h.calls.length, 1);
    assert.equal(h.calls[0].mode, "review");
});

test("unauthorized replacement cannot cancel or clear an existing job", async () => {
    const h = await workerHarness();
    const old = await h.send({ action: "START_CAIRO_JOB", mode: "validation" });
    await flush();
    let cancelled = false;
    h.context.cancelPendingRequests = () => { cancelled = true; };
    const response = await h.send({ action: "START_CAIRO_JOB", mode: "review", replaceExisting: true }, { ...h.sender, id: "another-extension" });
    assert.equal(response.success, false);
    assert.equal(cancelled, false);
    assert.ok(h.session.values[`cairoJob:${old.jobId}`]);
    h.releaseSession();
    await flush();
});

for (const mode of ["validation", "review"]) {
    test(`plugin cancel force-stops ${mode} during sign-in, clears run data, and permits a new run`, async () => {
        const h = await workerHarness();
        h.context.console = { ...console, error() {} };
        const assessment = { ...row, assessmentId: row.incompleteAssessmentId };
        await h.send({ action: mode === "review" ? "START_REVIEW" : "START_VALIDATION", assessments: [assessment] }, h.viewSender);
        await flush();
        await h.local.set({ validationResults: ["old"], reviewResults: ["old"], failedAssessments: [assessment],
            assessmentContexts: { old: {} }, asaSettings: { enabled: true }, reviewQuestionNotes: { saved: "keep" } });
        await h.session.set({ "cairoJob:old": { state: "running" } });
        let aborts = 0;
        h.context.cancelPendingRequests = () => { aborts++; };
        const action = mode === "review" ? "STOP_REVIEW" : "STOP_VALIDATION";
        const responses = await Promise.all([h.send({ action }, h.viewSender), h.send({ action }, h.viewSender)]);
        assert.ok(responses.every(response => response.success));
        assert.equal(aborts, 1, "duplicate clicks share one force stop");
        for (const key of ["validationResults", "reviewResults", "validationProgress", "reviewProgress", "failedAssessments", "assessmentContexts", "lastAction"]) {
            assert.equal(h.local.values[key], undefined, key);
        }
        assert.equal(h.session.values["cairoJob:old"], undefined);
        assert.ok(h.local.values.resultsResetId);
        assert.deepEqual(h.local.values.asaSettings, { enabled: true });
        assert.deepEqual(h.local.values.reviewQuestionNotes, { saved: "keep" });
        assert.equal(h.calls.length, 0, "cancel does not wait for sign-in or start the old engine");
        assert.equal((await h.send({ action: "START_VALIDATION", assessments: [assessment] }, h.viewSender)).success, true);
        h.releaseSession();
        await flush();
        assert.equal(h.calls.length, 1);
        assert.equal(h.calls[0].mode, "validation");
    });

    test(`cancelling an active ${mode} discards its late engine result and progress`, async () => {
        const h = await workerHarness();
        h.context.console = { ...console, error() {} };
        let progressCallback;
        let finish;
        const engine = async (...args) => {
            progressCallback = args[mode === "review" ? 2 : 1];
            return new Promise(resolve => { finish = resolve; });
        };
        h.context[mode === "review" ? "reviewBatch" : "validateBatch"] = engine;
        h.releaseSession();
        await h.send({ action: mode === "review" ? "START_REVIEW" : "START_VALIDATION",
            assessments: [{ ...row, assessmentId: row.incompleteAssessmentId }] }, h.viewSender);
        await flush();
        assert.equal(typeof finish, "function");
        h.context.cancelPendingRequests = () => {
            progressCallback({ completed: 1, total: 1, current: "late", assessment: row, result: { stale: true } });
            finish([{ stale: true }]);
        };
        assert.equal((await h.send({ action: mode === "review" ? "STOP_REVIEW" : "STOP_VALIDATION" }, h.viewSender)).success, true);
        await progressCallback({ completed: 1, total: 1, current: "still late" });
        for (const key of ["validationProgress", "reviewProgress", "validationResults", "reviewResults", "validations", "reviews", "validationError", "reviewError"]) {
            assert.equal(h.local.values[key], undefined, key);
        }
    });
}

test("unsupported templates do not inject; SPA navigation removes old buttons", async () => {
    const unsupported = await contentHarness(false);
    assert.equal(unsupported.body.children.length, 1);
    const h = await contentHarness();
    h.location.href = "https://cairois.web.boeing.com/Assets/40326";
    h.location.pathname = "/Assets/40326";
    await h.reconcile();
    assert.equal(h.document.getElementById("risk-profiler-cairo-actions"), undefined);
});

test("built package includes the content script and Cairo-only result frame", async () => {
    const manifest = JSON.parse(await readFile(new URL("../dist/manifest.json", import.meta.url), "utf8"));
    assert.deepEqual(manifest.content_scripts[0].js, ["cairoSurvey.bundle.js"]);
    assert.equal(manifest.content_scripts[0].all_frames, false);
    const frame = manifest.web_accessible_resources.find(resource => resource.resources.includes("popup.html"));
    assert.deepEqual(frame.matches, ["https://cairois.web.boeing.com/*"]);
    const html = await readFile(new URL("../dist/popup.html", import.meta.url), "utf8");
    assert.match(html, /popup.bundle.js/);
    assert.match(html, /cairoReviewEmailBtn/);
    assert.ok((await readFile(new URL("../dist/cairoSurvey.bundle.js", import.meta.url), "utf8")).length > 0);
});

async function popupHarness(job, emailEnabled = false) {
    const elements = new Map();
    const get = id => {
        if (!elements.has(id)) {
            const element = new Element("div");
            const classes = new Set(["hidden"]);
            element.classList = {
                add: (...values) => values.forEach(value => classes.add(value)),
                remove: value => classes.delete(value),
                toggle: (value, enabled) => enabled ? classes.add(value) : classes.delete(value),
                contains: value => classes.has(value)
            };
            elements.set(id, element);
        }
        return elements.get(id);
    };
    const calls = [];
    const context = vm.createContext({
        CONFIG, ASA_MODE: true, PREREQUISITE_CHECKS, REVIEW_MODES: { INITIAL: "initial", SELECTED_ANSWERS: "selectedAnswers" },
        location: { search: "?view=cairo&job=test-job" }, URLSearchParams,
        document: { addEventListener() {}, getElementById: get, body: get("body") },
        chrome: { runtime: { async sendMessage(message) { calls.push(message); return { success: true, job }; } } },
        setInterval() {}, clearInterval() {}, calls,
        exportResults: async results => calls.push({ exported: results })
    });
    vm.runInContext(withoutImports(await readFile(new URL("../popup.js", import.meta.url), "utf8")), context);
    // Keep the actual embedded entry point and export function; replace renderers with spies.
    vm.runInContext(`
        loadAsaSettings = async () => {};
        loadReviewQuestionNotes = async () => {};
        loadReviewModeSetting = async () => {};
        attachEvents = () => {};
        activateResultsTab = mode => calls.push({ tab: mode });
        renderProgress = (progress, mode) => calls.push({ progress, mode });
        renderResults = results => calls.push({ validation: results });
        renderReviewResults = results => calls.push({ review: results });
        openReviewNotesModal = id => calls.push({ notes: id });
        openReviewEmail = async id => calls.push({ email: id });
        asaSettings = { enabled: ${emailEnabled}, emailTemplateEnabled: ${emailEnabled}, emailTemplateHtml: "<p>Review</p>" };
    `, context);
    await vm.runInContext("initialize()", context);
    return { calls, get, context };
}

test("embedded validation only reads its job snapshot and exports those results", async () => {
    const results = [{ assessment: { assessmentId: 41559874 }, results: [] }];
    const h = await popupHarness({ mode: "validation", state: "complete", route, results, progress: { completed: 1, total: 1 } });
    assert.equal(h.calls[0].action, "GET_CAIRO_JOB");
    assert.equal(h.calls[0].jobId, "test-job");
    assert.deepEqual(h.calls.find(call => call.validation).validation, results);
    assert.equal(h.calls.some(call => call.action?.startsWith("START")), false);
    assert.equal(h.get("exportBtn").classList.contains("hidden"), false);
    await vm.runInContext("exportExcel()", h.context);
    assert.deepEqual(h.calls.find(call => call.exported).exported, results);
});

test("email templates support Last Assessment ID independently of the current assessment ID", async () => {
    const h = await popupHarness({ mode: "review", state: "complete", route, results: [] });
    const review = { assessmentId: 41559874, incompleteAssessmentId: 41559874, lastAssessmentId: 26750839 };
    const template = "Last: {{LAST_ASSESSMENT_ID}}; current: {{INCOMPLETE_ASSESSMENT_ID}}; last again: {{LAST_ASSESSMENT_ID}}";
    const expected = "Last: 26750839; current: 41559874; last again: 26750839";
    assert.equal(h.context.replaceTemplatePlaceholders(template, review), expected);
    assert.equal(h.context.replaceTemplatePlaceholders(template, review, { escapeHtml: false }), expected);
    assert.equal(h.context.replaceTemplatePlaceholders("Last: {{LAST_ASSESSMENT_ID}}", {}), "Last: ");
    assert.equal(h.context.replaceTemplatePlaceholders("{{LAST_ASSESSMENT_ID}}", { lastAssessmentId: '<>&"' }), "&lt;&gt;&amp;&quot;");
    const html = await readFile(new URL("../popup.html", import.meta.url), "utf8");
    assert.match(html, /<option value="\{\{LAST_ASSESSMENT_ID\}\}">Last Assessment ID<\/option>/);
});

test("embedded review opens standard notes and wires the configured email action", async () => {
    const results = [{ assessmentId: 41559874, workQueue: [] }];
    const h = await popupHarness({ mode: "review", state: "complete", route, results }, true);
    assert.deepEqual(h.calls.find(call => call.review).review, results);
    assert.equal(h.calls.find(call => call.notes).notes, "41559874");
    assert.equal(h.get("cairoReviewEmailBtn").disabled, false);
    await h.get("cairoReviewEmailBtn").listeners.click();
    assert.equal(h.calls.find(call => call.email).email, "41559874");
    const unconfigured = await popupHarness({ mode: "review", state: "complete", route, results });
    assert.equal(unconfigured.get("cairoReviewEmailBtn").disabled, true);
    assert.match(unconfigured.get("cairoReviewEmailBtn").title, /Configure ASA Mode/);
});

test("plugin cancel clears the UI immediately and prevents a late poll restoring old results", async () => {
    const h = await popupHarness({ mode: "validation", state: "complete", route, results: [{ old: true }] });
    let resolveStop;
    let resolvePoll;
    let poll;
    let stops = 0;
    h.context.chrome.runtime.sendMessage = () => { stops++; return new Promise(resolve => { resolveStop = resolve; }); };
    h.context.chrome.storage = { local: { get: () => new Promise(resolve => { resolvePoll = resolve; }) } };
    h.context.setInterval = callback => { poll = callback; };
    vm.runInContext("startProgressPolling()", h.context);
    const pendingPoll = poll();
    const pendingStop = vm.runInContext("forceCancelJob('validation')", h.context);
    await vm.runInContext("forceCancelJob('validation')", h.context);
    assert.equal(stops, 1);
    assert.equal(vm.runInContext("validationResults.length + reviewResults.length", h.context), 0);
    assert.equal(h.get("progressContainer").classList.contains("hidden"), true);
    assert.equal(h.get("exportBtn").classList.contains("hidden"), true);
    assert.equal(h.get("progressFill").style.width, "0%");
    assert.equal(h.get("validateBtn").disabled, true);
    assert.equal(h.get("reviewBtn").disabled, true);
    resolvePoll({ validationComplete: true, validationResults: [{ stale: true }] });
    await pendingPoll;
    assert.equal(h.calls.some(call => call.validation?.some(row => row.stale)), false);
    resolveStop({ success: true });
    await pendingStop;
    assert.equal(h.get("validateBtn").disabled, false);
    assert.equal(h.get("reviewBtn").disabled, false);
});

test("plugin review cancel failures are visible and can be retried", async () => {
    const h = await popupHarness({ mode: "review", state: "complete", route, results: [] });
    h.context.chrome.runtime.sendMessage = async message => {
        assert.equal(message.action, "STOP_REVIEW");
        return { success: false, error: "Worker unavailable" };
    };
    await vm.runInContext("forceCancelJob('review')", h.context);
    assert.match(h.get("progressText").textContent, /Cancellation failed: Worker unavailable/);
    assert.equal(h.get("cancelReviewBtn").classList.contains("hidden"), false);
    assert.equal(vm.runInContext("cancellationInProgress", h.context), false);
});

test("a stop from another plugin view clears stale local results on polling", async () => {
    const h = await popupHarness({ mode: "review", state: "complete", route, results: [{ old: true }] });
    let poll;
    h.context.setInterval = callback => { poll = callback; };
    h.context.chrome.storage = { local: { get: async () => ({ resultsResetId: "new-reset" }) } };
    vm.runInContext("startProgressPolling()", h.context);
    await poll();
    assert.equal(vm.runInContext("validationResults.length + reviewResults.length", h.context), 0);
    assert.equal(h.get("reviewNotesModal").classList.contains("hidden"), true);
    assert.equal(h.get("progressContainer").classList.contains("hidden"), true);
});

test("a newly started run remains visible when polling observes the previous reset marker", async () => {
    const h = await popupHarness({ mode: "validation", state: "complete", route, results: [] });
    let poll;
    h.context.setInterval = callback => { poll = callback; };
    h.context.chrome.storage = { local: { get: async () => ({ resultsResetId: "previous-stop",
        lastAction: "review", reviewProgress: { completed: 0, total: 1, current: "New app" } }) } };
    vm.runInContext("startProgressPolling()", h.context);
    await poll();
    assert.equal(h.get("progressContainer").classList.contains("hidden"), false);
    assert.equal(h.get("cancelReviewBtn").classList.contains("hidden"), false);
    assert.equal(h.get("reviewBtn").disabled, true);
});

test("rejected popup starts surface the worker error and restore controls", async () => {
    const h = await popupHarness({ mode: "validation", state: "complete", route, results: [] });
    h.context.chrome.runtime.sendMessage = async () => ({ success: false, error: "Another assessment job is running" });
    assert.equal(await h.context.requestAssessmentStart({ action: "START_REVIEW" }), false);
    assert.match(h.get("progressText").textContent, /Unable to start: Another assessment job is running/);
    assert.equal(h.get("cancelReviewBtn").classList.contains("hidden"), true);
    assert.equal(h.get("reviewBtn").disabled, false);
    assert.equal(h.get("validateBtn").disabled, false);
});

test("validation errors remain visible even when the failed job left progress in storage", async () => {
    const h = await popupHarness({ mode: "validation", state: "complete", route, results: [] });
    let poll;
    h.context.setInterval = callback => { poll = callback; };
    h.context.chrome.storage = { local: { get: async () => ({ lastAction: "validation", validationError: "Data unavailable",
        validationProgress: { completed: 0, total: 1 }, validationComplete: false }) } };
    h.context.startProgressPolling();
    await poll();
    assert.equal(h.get("progressText").textContent, "Data unavailable");
    assert.equal(h.get("validateBtn").disabled, false);
});

test("plugin reset stops running work before clearing all local data", async () => {
    const h = await popupHarness({ mode: "validation", state: "complete", route, results: [] });
    const order = [];
    h.context.window = { confirm: () => true, setTimeout() {} };
    h.context.chrome.runtime.sendMessage = async message => { order.push(message.action); return { success: true }; };
    h.context.chrome.storage = { local: { clear: async () => { order.push("clear"); } } };
    await h.context.handleClearResetPlugin();
    assert.deepEqual(order, ["STOP_VALIDATION", "clear"]);
    h.context.chrome.runtime.sendMessage = async () => ({ success: false, error: "Unable to stop" });
    await h.context.handleClearResetPlugin();
    assert.equal(order.filter(item => item === "clear").length, 1, "a failed stop must not erase data under a running job");
    assert.match(h.get("layoutSettingsStatus").textContent, /Unable to stop/);
});

test("cancel during Cairo snapshot preparation cannot restart the engine or recreate an old snapshot", async () => {
    const h = await workerHarness();
    h.context.console = { ...console, error() {} };
    const get = h.session.get;
    let release;
    let preparing = false;
    h.session.get = async keys => {
        if (keys === null && !preparing) {
            preparing = true;
            await new Promise(resolve => { release = resolve; });
        }
        return get(keys);
    };
    const start = h.send({ action: "START_CAIRO_JOB", mode: "validation" });
    await flush();
    assert.equal(preparing, true);
    const stop = h.send({ action: "STOP_VALIDATION" }, h.viewSender);
    await flush();
    release();
    assert.equal((await stop).success, true);
    assert.equal((await start).success, false);
    h.releaseSession();
    await flush();
    assert.equal(h.calls.length, 0);
    assert.equal(Object.keys(h.session.values).filter(key => key.startsWith("cairoJob:")).length, 0);
});

test("result clearing blocks new starts until its storage mutation finishes", async () => {
    const h = await workerHarness();
    const remove = h.local.remove;
    let release;
    h.local.remove = async keys => {
        if (keys.includes("validationResults")) await new Promise(resolve => { release = resolve; });
        return remove(keys);
    };
    const clear = h.send({ action: "CLEAR_RESULTS" }, h.viewSender);
    await flush();
    const assessments = [{ ...row, assessmentId: row.incompleteAssessmentId }];
    const rejected = await h.send({ action: "START_REVIEW", assessments }, h.viewSender);
    assert.equal(rejected.success, false);
    assert.equal(rejected.code, "JOB_RUNNING");
    release();
    assert.equal((await clear).success, true);
    h.local.remove = remove;
    assert.equal((await h.send({ action: "START_REVIEW", assessments }, h.viewSender)).success, true);
    h.releaseSession();
    await flush();
});

test("a malformed Cairo list does not erase previously saved assessment inventory", async () => {
    const h = await workerHarness();
    h.context.console = { ...console, error() {} };
    await h.local.set({ assessments: [row], assessmentCount: 1 });
    h.context.getAssessmentList = async () => ({ invalid: true });
    const response = await h.send({ action: "REFRESH_ASSESSMENTS" }, h.viewSender);
    assert.equal(response.success, false);
    assert.match(response.error, /not a valid array/);
    assert.deepEqual(h.local.values.assessments, [row]);
    assert.equal(h.local.values.assessmentCount, 1);
});

test("a denied clear preserves displayed results rather than pretending it succeeded", async () => {
    const h = await popupHarness({ mode: "review", state: "complete", route, results: [{ assessmentId: 11 }] });
    h.context.chrome.runtime.sendMessage = async () => ({ success: false, error: "Another assessment job is running" });
    await h.context.clearReviewResults();
    assert.equal(vm.runInContext("reviewResults.length", h.context), 1);
    assert.match(h.get("progressText").textContent, /Unable to clear: Another assessment job is running/);
});
