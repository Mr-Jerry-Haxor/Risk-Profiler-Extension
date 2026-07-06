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

        await updateStatus(
            "Loading assessments..."
        );

        const data =
            await getAssessmentList();

        const normalized =
            data.map(item => {

                const assessmentId =
                    item.incompleteAssessmentId ??
                    item.lastAssessmentId;

                return {

                    assetId:
                        item.assetId,

                    assetName:
                        item.assetName,

                    assessmentId,

                    lastAssessmentId:
                        item.lastAssessmentId,

                    incompleteAssessmentId:
                        item.incompleteAssessmentId,

                    surveyCompletedOn:
                        item.surveyCompletedOn,

                    dueOn:
                        item.dueOn,

                    attestOn:
                        item.attestOn,

                    attestName:
                        item.attestName,

                    attestId:
                        item.attestId,

                    incompleteInitiatedOn:
                        item.incompleteInitiatedOn,

                    incompleteInitiatedById:
                        item.incompleteInitiatedById,

                    incompleteInitiatedByName:
                        item.incompleteInitiatedByName,

                    appMgrName:
                        item.appMgrName,

                    sysOwnerName:
                        item.sysOwnerName,

                    owningBusUnit:
                        item.owningBusUnit,

                    lifeCycle:
                        item.lifeCycle,

                    hasIncomplete:
                        !!item.incompleteAssessmentId,

                    raw:
                        item
                };
            });

        await saveAssessments(
            normalized
        );

        await chrome.storage.local.set({

            assessmentCount:
                normalized.length,

            lastRefresh:
                Date.now()
        });

        await updateStatus(
            `Loaded ${normalized.length} assessments`
        );

        return normalized;

    } catch (error) {

        console.error(error);

        await updateError(
            error.message
        );

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

    try {

        await chrome.storage.local.set({

            validationComplete:
                false,

            validationResults:
                null,

            validationError:
                null
        });

        await updateStatus(
            "Validation started"
        );

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
                Date.now()
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
    assessments
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

    try {

        await chrome.storage.local.set({

            reviewComplete:
                false,

            reviewResults:
                null,

            reviewError:
                null,

            lastAction:
                "review"
        });

        await updateReviewStatus(
            "Review started"
        );

        const results =
            await reviewBatch(

                assessments,

                async progress => {

                    const {
                        assessment,
                        result,
                        ...progressState
                    } = progress;

                    await updateReviewProgress({

                        runId:
                            currentReviewId,

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

async function checkPrerequisite(
    check
) {

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
                        "follow"
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

        const passed =
            !redirectedToLogin &&
            !unauthorized &&
            response.status < 500;

        return {

            id:
                check.id,

            name:
                check.name,

            passed,

            status:
                response.status,

            finalUrl,

            message:
                passed
                    ? `${check.name} session is active`
                    : redirectedToLogin
                        ? `${check.name} redirected to sign-on`
                        : `${check.name} returned HTTP ${response.status}`
        };

    } catch (error) {

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

            message:
                error.message
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
