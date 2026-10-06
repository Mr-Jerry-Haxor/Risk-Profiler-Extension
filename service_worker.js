import {
    getAssessmentList
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
    PREREQUISITE_CHECKS
}
from "./utils/constants.js";

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

const SESSION_RETRY_INTERVAL_MS = 3000;

const prerequisiteTabIds =
    new Map();

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
                : [];

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
        validationRunning
    ) {

        throw new Error(
            "Validation already running"
        );
    }

    cancellationRequested = false;
    validationRunning = true;

    const failedAssessments = [];

    const contextStore = {};

    currentValidationId =
        createRunId();

    validationStartedAt =
        Date.now();

    try {

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

                async progress => {

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

                    await updateStatus(

                        `Processing ${progressState.completed}/${progressState.total}`
                    );
                },

                () => cancellationRequested
            );

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
                Date.now(),

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
                    Date.now()
            }
        });

        await updateStatus(
            "Validation completed"
        );

        return results;

    } catch (error) {

        console.error(error);

        await updateError(
            error.message
        );

        throw error;

    } finally {

        validationRunning = false;
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
        reviewRunning
    ) {

        throw new Error(
            "Review already running"
        );
    }

    reviewCancellationRequested = false;
    reviewRunning = true;

    currentReviewId =
        createRunId();

    reviewStartedAt =
        Date.now();

    try {

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

                async progress => {

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

                    await updateReviewStatus(

                        `Reviewing ${progressState.completed}/${progressState.total}`
                    );
                },

                () => reviewCancellationRequested
            );

        await saveReviewResults(
            results
        );

        await chrome.storage.local.set({

            reviewResults:
                results,

            reviewComplete:
                true,

            reviewCompletedAt:
                Date.now(),

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
                    Date.now()
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

        await updateReviewError(
            error.message
        );

        throw error;

    } finally {

        reviewRunning = false;
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

        "reviewStatus"
    ]);
}

function isLoginRedirect(
    finalUrl,
    expectedHosts
) {

    let parsed;

    try {

        parsed =
            new URL(
                finalUrl
            );

    } catch {

        return true;
    }

    const host =
        parsed.hostname.toLowerCase();

    const expected =
        expectedHosts.map(
            item =>
                item.toLowerCase()
        );

    const urlText =
        finalUrl.toLowerCase();

    return !expected.includes(
        host
    ) ||
        urlText.includes(
            "login"
        ) ||
        urlText.includes(
            "logon"
        ) ||
        urlText.includes(
            "sso"
        ) ||
        urlText.includes(
            "wsso"
        );
}

async function ensurePrerequisiteTab(
    check
) {

    const openUrl =
        check.openUrl ||
        check.url;

    const tabs =
        await chrome.tabs.query({
            url:
                `${openUrl}*`
        });

    const matchingTab =
        tabs.find(
            tab =>
                tab.id
        );

    if (
        matchingTab
    ) {

        prerequisiteTabIds.set(
            check.id,
            matchingTab.id
        );

        return {
            tab:
                matchingTab,
            opened:
                false
        };
    }

    const trackedTabId =
        prerequisiteTabIds.get(
            check.id
        );

    if (
        trackedTabId
    ) {

        try {

            const trackedTab =
                await chrome.tabs.get(
                    trackedTabId
                );

            if (
                trackedTab?.id
            ) {

                return {
                    tab:
                        trackedTab,
                    opened:
                        false
                };
            }

        } catch {

            prerequisiteTabIds.delete(
                check.id
            );
        }
    }

    const openedTab =
        await chrome.tabs.create({
            url:
                openUrl
        });

    if (
        openedTab?.id
    ) {

        prerequisiteTabIds.set(
            check.id,
            openedTab.id
        );
    }

    return {
        tab:
            openedTab,
        opened:
            true
    };
}

async function tryEnsurePrerequisiteTab(
    check
) {

    try {

        return await ensurePrerequisiteTab(
            check
        );

    } catch (error) {

        console.warn(
            `Unable to open ${check.name} prerequisite tab:`,
            error
        );

        return {
            tab:
                null,
            opened:
                false
        };
    }
}

async function hasEsatsToken(
    tab
) {

    if (
        !tab?.id ||
        tab.status !== "complete"
    ) {

        return false;
    }

    try {

        const results =
            await chrome.scripting.executeScript({
                target: {
                    tabId:
                        tab.id
                },
                world:
                    "MAIN",
                func:
                    () =>
                        Boolean(
                            localStorage.getItem(
                                "esatsToken"
                            )
                        )
            });

        return results?.[0]?.result === true;

    } catch {

        return false;
    }
}

async function checkPrerequisite(
    check
) {

    const tabState =
        await tryEnsurePrerequisiteTab(
            check
        );

    try {

        const response =
            await fetch(
                check.url,
                {
                    credentials:
                        "include",

                    cache:
                        "no-store",

                    redirect:
                        "follow",

                    signal:
                        AbortSignal.timeout(
                            15000
                        )
                }
            );

        const finalUrl =
            response.url || check.url;

        const redirectedToLogin =
            isLoginRedirect(
                finalUrl,
                check.expectedHosts
            );

        const unauthorized =
            response.status === 401 ||
            response.status === 403;

        const endpointPassed =
            !redirectedToLogin &&
            !unauthorized &&
            response.status < 500;

        const pagePassed =
            check.id === "esats"
                ? await hasEsatsToken(
                    tabState.tab
                )
                : true;

        const passed =
            endpointPassed &&
            pagePassed;

        const openedTab =
            tabState.opened;

        return {

            id:
                check.id,

            name:
                check.name,

            passed,

            status:
                response.status,

            finalUrl,

            openedTab,

            message:
                passed
                    ? `${check.name} session is active`
                    : check.id === "esats" &&
                        !pagePassed
                        ? `${check.name} is waiting for sign-in${openedTab ? "; opened ESATS in a new tab" : ""}`
                    : redirectedToLogin
                        ? `${check.name} redirected to sign-on${openedTab ? `; opened ${check.name} in a new tab` : ""}`
                        : `${check.name} returned HTTP ${response.status}${openedTab ? `; opened ${check.name} in a new tab` : ""}`
        };

    } catch (error) {

        const openedTab =
            tabState.opened;

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
                check.url,

            openedTab,

            message:
                `${error.message}${openedTab ? `; opened ${check.name} in a new tab` : ""}`
        };
    }
}

async function checkPrerequisites() {

    const checks =
        await Promise.all(
            PREREQUISITE_CHECKS.map(
                check =>
                    checkPrerequisite(
                        check
                    )
            )
        );

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

    await chrome.storage.local.set({

        prerequisiteStatus:
            result
    });

    return result;
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
    jobName,
    shouldCancel,
    updateJobStatus,
    updateJobProgress,
    total,
    runId,
    startedAt
}) {

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
            await checkPrerequisites();

        if (
            prerequisites.passed
        ) {

            await updateJobStatus(
                "All prerequisite sessions are active"
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
            `Waiting for sign-in: ${waitingFor}`;

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

        await delay(
            SESSION_RETRY_INTERVAL_MS
        );
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

                    switch (
                        message.action
                    ) {

                        case "REFRESH_ASSESSMENTS":

                            const assessments =
                                await refreshAssessments();

                            sendResponse({

                                success: true,

                                count:
                                    assessments.length
                            });

                            break;

                        case "START_VALIDATION":

                            runValidationJob(

                                message.assessments
                            ).catch(error => {

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

                            runReviewJob(

                                message.assessments,

                                message.reviewConfig || {}
                            ).catch(error => {

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
                                    await checkPrerequisites()
                            });

                            break;

                        case "STOP_VALIDATION":

                            cancellationRequested = true;

                            await updateStatus(
                                "Cancellation requested"
                            );

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

                            reviewCancellationRequested = true;

                            await updateReviewStatus(
                                "Review cancellation requested"
                            );

                            sendResponse({
                                success:true
                            });

                            break;

                        case "CLEAR_RESULTS":

                            await clearValidationData();

                            sendResponse({

                                success: true
                            });

                            break;

                        case "CLEAR_REVIEW_RESULTS":

                            await clearReviewData();

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
                            error.message
                    });
                }

            }
        )();

        return true;
    }
);

/*
====================================================
ALARM REFRESH
====================================================
*/

chrome.runtime.onInstalled.addListener(
    async () => {

        await restorePluginLayout();

        chrome.alarms.create(

            "assessment_refresh",

            {
                periodInMinutes:
                    30
            }
        );

        try {

            await refreshAssessments();

        } catch {

            // ignore
        }
    }
);

chrome.runtime.onStartup.addListener(
    async () => {

        try {

            await restorePluginLayout();

            await refreshAssessments();

        } catch {

            // ignore
        }
    }
);

chrome.alarms.onAlarm.addListener(

    async alarm => {

        if (

            alarm.name ===
            "assessment_refresh"

        ) {

            try {

                await refreshAssessments();

            } catch (error) {

                console.error(error);
            }
        }
    }
);

/*
====================================================
KEEPALIVE LOGGING
====================================================
*/

setInterval(() => {

    console.log(

        "[RP] Service Worker Alive",

        {
            validationRunning,
            reviewRunning,
            currentValidationId,
            currentReviewId
        }
    );

}, 60000);
