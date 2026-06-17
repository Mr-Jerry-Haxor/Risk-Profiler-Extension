import {
    getAssessments,
    getContexts,
    getFailedAssessments,
    getValidationResults
}
from "./storage/storage.js";

import {
    filterAssessments,
    selectAll
}
from "./core/assessmentSelector.js";

import {
    exportResults
}
from "./export/excelExporter.js";

let assessments = [];

let filteredAssessments = [];

let selectedAssessmentIds = [];

let validationResults = [];

/*
====================================================
DOM HELPERS
====================================================
*/

const $ = id =>
    document.getElementById(id);

/*
====================================================
INIT
====================================================
*/

document.addEventListener(
    "DOMContentLoaded",
    initialize
);

async function initialize() {

    await loadAssessments();

    attachEvents();

    await loadPrerequisiteStatus();

    checkPrerequisites();

    startProgressPolling();

    loadExistingResults();
}

/*
====================================================
LOAD ASSESSMENTS
====================================================
*/

async function loadAssessments() {

    assessments =
        await getAssessments();

    filteredAssessments =
        [...assessments];

    populateOwnerFilter();

    renderAssessments();
}

function populateOwnerFilter() {

    const ownerFilter =
        $("ownerFilter");

    if (!ownerFilter)
        return;

    const owners =
        [
            ...new Set(
                assessments.map(
                    a =>
                        a.appMgrName
                )
            )
        ]
        .filter(Boolean)
        .sort();

    owners.forEach(owner => {

        const option =
            document.createElement(
                "option"
            );

        option.value =
            owner;

        option.textContent =
            owner;

        ownerFilter.appendChild(
            option
        );
    });
}

/*
====================================================
EVENTS
====================================================
*/

function attachEvents() {

    $("searchInput")
        ?.addEventListener(
            "input",
            applyFilters
        );

    $("regexMode")
        ?.addEventListener(
            "change",
            applyFilters
        );

    $("fromDate")
        ?.addEventListener(
            "change",
            applyFilters
        );

    $("toDate")
        ?.addEventListener(
            "change",
            applyFilters
        );

    $("lifeCycleFilter")
        ?.addEventListener(
            "change",
            applyFilters
        );

    $("ownerFilter")
        ?.addEventListener(
            "change",
            applyFilters
        );

    $("refreshBtn")
        ?.addEventListener(
            "click",
            refreshAssessments
        );

    $("checkPrereqBtn")
        ?.addEventListener(
            "click",
            checkPrerequisites
        );

    $("selectAllBtn")
        ?.addEventListener(
            "click",
            handleSelectAll
        );

    $("clearSelectionBtn")
        ?.addEventListener(
            "click",
            handleClearSelection
        );

    $("validateBtn")
        ?.addEventListener(
            "click",
            startValidation
        );

    $("cancelBtn")
        ?.addEventListener(
            "click",
            async () => {

                await chrome.runtime.sendMessage({

                    action:
                        "STOP_VALIDATION"
                });
            }
        );

    $("retryFailedBtn")
        ?.addEventListener(
            "click",
            retryFailedAssessments
        );

    $("exportBtn")
        ?.addEventListener(
            "click",
            exportExcel
        );
}

/*
====================================================
FILTERS
====================================================
*/

function applyFilters() {

    const filters = {

        search:
            $("searchInput")
                ?.value || "",

        regexMode:
            $("regexMode")
                ?.checked || false,

        fromDate:
            $("fromDate")
                ?.value || "",

        toDate:
            $("toDate")
                ?.value || "",

        lifeCycle:
            $("lifeCycleFilter")
                ?.value || ""
    };

    filteredAssessments =
        filterAssessments(
            assessments,
            filters
        );

    const owner =
        $("ownerFilter")
            ?.value;

    if (owner) {

        filteredAssessments =
            filteredAssessments.filter(
                x =>
                    x.appMgrName === owner
            );
    }

    renderAssessments();
}

/*
====================================================
ASSESSMENT LIST
====================================================
*/

function renderAssessments() {

    const container =
        $("assessmentList");

    container.innerHTML = "";

    filteredAssessments.forEach(
        assessment => {

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                "assessment-row";

            row.innerHTML = `

                <input
                    type="checkbox"
                    class="assessment-checkbox"
                    data-id="${assessment.assessmentId}"
                    ${selectedAssessmentIds.includes(
                        assessment.assessmentId
                    )
                    ? "checked"
                    : ""
                    }
                >

                <div class="assessment-meta">

                    <div class="asset-name">

                        ${assessment.assetName}

                    </div>

                    <div class="asset-sub">

                        ID:
                        ${assessment.assessmentId}

                        •

                        ${assessment.lifeCycle}

                        •

                        ${assessment.appMgrName || "N/A"}

                    </div>

                </div>

            `;

            container.appendChild(
                row
            );
        }
    );

    bindCheckboxes();

    updateSelectedCount();
}

function bindCheckboxes() {

    document
        .querySelectorAll(
            ".assessment-checkbox"
        )
        .forEach(cb => {

            cb.addEventListener(
                "change",
                event => {

                    const id =
                        Number(
                            event.target.dataset.id
                        );

                    if (
                        event.target.checked
                    ) {

                        if (
                            !selectedAssessmentIds.includes(id)
                        ) {

                            selectedAssessmentIds.push(
                                id
                            );
                        }

                    } else {

                        selectedAssessmentIds =
                            selectedAssessmentIds.filter(
                                x => x !== id
                            );
                    }

                    updateSelectedCount();
                }
            );
        });
}

function updateSelectedCount() {

    $("selectedCount").textContent =
        `${selectedAssessmentIds.length} Selected`;
}

/*
====================================================
SELECTION ACTIONS
====================================================
*/

function handleSelectAll() {

    selectedAssessmentIds =
        selectAll(
            filteredAssessments
        );

    renderAssessments();
}

function handleClearSelection() {

    selectedAssessmentIds = [];

    renderAssessments();
}

/*
====================================================
REFRESH
====================================================
*/

async function refreshAssessments() {

    $("refreshBtn").disabled =
        true;

    try {

        await chrome.runtime.sendMessage({

            action:
                "REFRESH_ASSESSMENTS"
        });

        await loadAssessments();

    } finally {

        $("refreshBtn").disabled =
            false;
    }
}

/*
====================================================
VALIDATION
====================================================
*/

async function startValidation() {

    const selected =
        assessments.filter(
            x =>
                selectedAssessmentIds.includes(
                    x.assessmentId
                )
        );

    if (
        selected.length === 0
    ) {

        alert(
            "Select at least one assessment."
        );

        return;
    }

    $("progressContainer")
        ?.classList.remove(
            "hidden"
        );

    $("cancelBtn")
        ?.classList.remove(
            "hidden"
        );

    $("retryFailedBtn")
        ?.classList.add(
            "hidden"
        );

    await chrome.runtime.sendMessage({

        action:
            "START_VALIDATION",

        assessments:
            selected
    });
}

/*
====================================================
PROGRESS
====================================================
*/

function startProgressPolling() {

    setInterval(
        async () => {

            const data =
                await chrome.storage.local.get([

                    "validationProgress",

                    "validationComplete",

                    "validationResults",

                    "validationError"
                ]);

            if (
                data.validationProgress
            ) {

                renderProgress(
                    data.validationProgress
                );
            }

            if (
                data.validationComplete
            ) {

                validationResults =
                    data.validationResults || [];

                renderResults(
                    validationResults
                );

                $("exportBtn")
                    ?.classList.remove(
                        "hidden"
                    );

                $("cancelBtn")
                    ?.classList.add(
                        "hidden"
                    );

                const failed =
                    await getFailedAssessments();

                if (
                    failed.length
                ) {

                    $("retryFailedBtn")
                        ?.classList.remove(
                            "hidden"
                        );
                } else {

                    $("retryFailedBtn")
                        ?.classList.add(
                            "hidden"
                        );
                }
            }

            if (
                data.validationError
            ) {

                $("cancelBtn")
                    ?.classList.add(
                        "hidden"
                    );

                $("progressText").textContent =
                    data.validationError;
            }

        },
        1000
    );
}

function renderProgress(
    progress
) {

    const percent =
        Math.round(
            (
                progress.completed /
                progress.total
            ) * 100
        );

    $("progressText").textContent =

        `${progress.completed}/${progress.total}
         - ${progress.current}`;

    $("progressFill").style.width =
        `${percent}%`;
}

/*
====================================================
RESULTS
====================================================
*/

function renderResults(
    results
) {

    const container =
        $("resultsContainer");

    container.innerHTML = "";

    results.forEach(
        result => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "result-card";

            card.innerHTML = `

                <div class="result-header">

                    <strong>

                        ${result.assetName}

                    </strong>

                    <span class="score-pill">

                        ${result.summary
                            ? `${result.summary.score}%`
                            : "Error"}

                    </span>

                </div>

                <div class="result-meta">

                    ${result.error
                        ? result.error
                        : `
                    PASS:
                    ${result.summary.passed}

                    |

                    FAIL:
                    ${result.summary.failed}

                    |

                    N/A:
                    ${result.summary.na}
                    `}

                </div>

                ${result.error
                    ? ""
                    : `
                <details>

                    <summary>
                        Checkpoints
                    </summary>

                    <div class="checkpoint-results">

                        ${result.results.map(
                            rule => `

                            <div>

                                <strong>
                                    ${rule.id}
                                </strong>

                                :

                                ${rule.status}

                                <br>

                                <small>
                                    ${rule.reason}
                                </small>

                            </div>

                            <hr>
                        `
                        ).join("")}

                    </div>

                </details>
                    `}

                <button
                    class="download-context btn-secondary"
                    data-id="${result.assessmentId}"
                >
                    Download Context
                </button>

            `;

            container.appendChild(
                card
            );
        }
    );

    document
        .querySelectorAll(
            ".download-context"
        )
        .forEach(btn => {

            btn.addEventListener(
                "click",
                () => {

                    downloadContext(
                        btn.dataset.id
                    );
                }
            );
        });
}

/*
====================================================
PREREQUISITES
====================================================
*/

async function loadPrerequisiteStatus() {

    const data =
        await chrome.storage.local.get(
            "prerequisiteStatus"
        );

    if (
        data.prerequisiteStatus
    ) {

        renderPrerequisites(
            data.prerequisiteStatus
        );
    }
}

async function checkPrerequisites() {

    setPrerequisitesChecking();

    try {

        const response =
            await chrome.runtime.sendMessage({

                action:
                    "CHECK_PREREQUISITES"
            });

        if (
            response?.success &&
            response.prerequisites
        ) {

            renderPrerequisites(
                response.prerequisites
            );
        }

    } catch (error) {

        $("prereqSummary").textContent =
            `Unable to check sessions: ${error.message}`;

        document
            .querySelectorAll(
                ".prereq-item .signal"
            )
            .forEach(signal => {

                signal.className =
                    "signal signal-fail";
            });
    }
}

function setPrerequisitesChecking() {

    $("prereqSummary").textContent =
        "Checking Cairo, ESATS, and GTC sessions...";

    document
        .querySelectorAll(
            ".prereq-item"
        )
        .forEach(item => {

            const signal =
            item.querySelector(
                    ".signal"
                );

            const message =
                item.querySelector(
                    "small"
                );

            signal.className =
                "signal signal-checking";

            if (
                message
            ) {

                message.textContent =
                    "Checking...";
            }

            item.title =
                "Checking session...";
        });
}

function renderPrerequisites(
    status
) {

    const checks =
        status.checks || [];

    checks.forEach(check => {

        const item =
            document.querySelector(
                `.prereq-item[data-site="${check.id}"]`
            );

        if (
            !item
        ) {
            return;
        }

        const signal =
            item.querySelector(
                ".signal"
            );

        const message =
            item.querySelector(
                "small"
            );

        signal.className =
            `signal ${check.passed
                ? "signal-pass"
                : "signal-fail"}`;

        if (
            message
        ) {

            message.textContent =
                check.passed
                    ? "Active"
                    : "Needs sign-in";
        }

        item.title =
            `${check.message}. Final URL: ${check.finalUrl}`;
    });

    const failed =
        checks.filter(
            check =>
                !check.passed
        );

    if (
        failed.length === 0 &&
        checks.length > 0
    ) {

        $("prereqSummary").textContent =
            "All prerequisite sessions are active.";

        return;
    }

    if (
        checks.length === 0
    ) {

        $("prereqSummary").textContent =
            "Session checks have not run yet.";

        return;
    }

    $("prereqSummary").textContent =
        `${failed.length} session check${failed.length === 1 ? "" : "s"} need attention. Open the help tooltip for sign-in steps.`;
}

async function loadExistingResults() {

    validationResults =
        await getValidationResults();

    if (
        validationResults &&
        validationResults.length
    ) {

        renderResults(
            validationResults
        );

        $("exportBtn")
            ?.classList.remove(
                "hidden"
            );
    }

    const failed =
        await getFailedAssessments();

    if (
        failed.length
    ) {

        $("retryFailedBtn")
            ?.classList.remove(
                "hidden"
            );
    }
}

async function retryFailedAssessments() {

    const failed =
        await getFailedAssessments();

    if (
        failed.length === 0
    ) {
        return;
    }

    $("progressContainer")
        ?.classList.remove(
            "hidden"
        );

    $("cancelBtn")
        ?.classList.remove(
            "hidden"
        );

    $("retryFailedBtn")
        ?.classList.add(
            "hidden"
        );

    await chrome.runtime.sendMessage({

        action:
            "START_VALIDATION",

        assessments:
            failed
    });
}

async function downloadContext(
    assessmentId
) {

    const contexts =
        await getContexts();

    const context =
        contexts[
            assessmentId
        ];

    if (
        !context
    ) {
        return;
    }

    const blob =
        new Blob(

            [
                JSON.stringify(
                    context,
                    null,
                    2
                )
            ],

            {
                type:
                    "application/json"
            }
        );

    const url =
        URL.createObjectURL(
            blob
        );

    const a =
        document.createElement(
            "a"
        );

    a.href =
        url;

    a.download =
        `context_${assessmentId}.json`;

    a.click();

    URL.revokeObjectURL(
        url
    );
}

/*
====================================================
EXPORT
====================================================
*/

async function exportExcel() {

    if (
        !validationResults ||
        validationResults.length === 0
    ) {
        return;
    }

    await exportResults(
        validationResults
    );
}
