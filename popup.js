import {
    getAssessments,
    getContexts,
    getFailedAssessments,
    getReviewResults,
    getValidationResults
}
from "./storage/storage.js";

import {
    filterAssessments,
    isIncompleteAssessment,
    selectAll
}
from "./core/assessmentSelector.js";

import {
    exportResults
}
from "./export/excelExporter.js";

import {
    CONFIG,
    PREREQUISITE_CHECKS
}
from "./utils/constants.js";

import {
    getRiskProfilerSurveyTemplates
}
from "./api/cairoApi.js";

import {
    surveyDifference
}
from "./core/surveyDiff.js";

let assessments = [];

let filteredAssessments = [];

let selectedAssessmentIds = [];

let validationResults = [];

let reviewResults = [];

let resultsRendered = false;

let reviewResultsRendered = false;

let activeResultsTab = "validation";

let activeReviewNotes = null;

let surveyTemplates = [];

let selectedSurveyFrom = null;

let selectedSurveyTo = null;

let surveyDiffRequestId = 0;

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

    setupSurveyDiffUI();
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

    $("dateFilterField")
        ?.addEventListener(
            "change",
            applyFilters
        );

    $("assessmentStatusFilter")
        ?.addEventListener(
            "change",
            applyFilters
        );

    $("ownerFilter")
        ?.addEventListener(
            "change",
            applyFilters
        );

    $("clearFiltersBtn")
        ?.addEventListener(
            "click",
            clearFilters
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

    $("reviewBtn")
        ?.addEventListener(
            "click",
            startReview
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

    $("clearResultsBtn")
        ?.addEventListener(
            "click",
            clearValidationResults
        );

    $("clearReviewResultsBtn")
        ?.addEventListener(
            "click",
            clearReviewResults
        );

    $("exportBtn")
        ?.addEventListener(
            "click",
            exportExcel
        );

    $("validationTabBtn")
        ?.addEventListener(
            "click",
            () => activateResultsTab("validation")
        );

    $("reviewTabBtn")
        ?.addEventListener(
            "click",
            () => activateResultsTab("review")
        );

    $("closeReviewNotesModalBtn")
        ?.addEventListener(
            "click",
            closeReviewNotesModal
        );

    $("reviewNotesModal")
        ?.addEventListener(
            "click",
            event => {
                if (event.target === $("reviewNotesModal")) {
                    closeReviewNotesModal();
                }
            }
        );

    $("copyReviewNotesBtn")
        ?.addEventListener(
            "click",
            copyReviewNotes
        );

    attachPrerequisiteOpenLinks();
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

        dateFilterField:
            $("dateFilterField")
                ?.value || "surveyCompletedOn",

        assessmentStatus:
            $("assessmentStatusFilter")
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

function clearFilters() {

    $("searchInput").value = "";

    $("regexMode").checked = false;

    $("fromDate").value = "";

    $("toDate").value = "";

    $("dateFilterField").value =
        "surveyCompletedOn";

    $("assessmentStatusFilter").value = "";

    $("ownerFilter").value = "";

    filteredAssessments =
        [...assessments];

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

            const status =
                getAssessmentStatus(
                    assessment
                );

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                `assessment-row ${status.className}`;

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

                        <span class="status-pill ${status.className}">
                            ${status.label}
                        </span>

                    </div>

                    <div class="asset-sub">

                        ID:
                        ${assessment.assessmentId}

                        •

                        ${assessment.lifeCycle}

                        •

                        ${assessment.appMgrName || "N/A"}

                    </div>

                    <div class="asset-sub date-info">

                        ${isIncompleteAssessment(assessment)
                            ? `<strong>Incomplete initiated date:</strong> ${formatDate(assessment.incompleteInitiatedOn || assessment.raw?.incompleteInitiatedOn) || "N/A"}`
                            : `<strong>Assessed date:</strong> ${formatDate(assessment.attestOn || assessment.raw?.attestOn) || "N/A"} • <strong>Survey completed date:</strong> ${formatDate(assessment.surveyCompletedOn || assessment.raw?.surveyCompletedOn) || "N/A"}`
                        }

                    </div>

                    <div class="asset-sub status-detail">

                        ${status.detail}

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

function getAssessmentStatus(
    assessment
) {

    const isIncomplete =
        isIncompleteAssessment(assessment);

    if (
        isIncomplete
    ) {

        const initiatedBy =
            assessment.incompleteInitiatedByName ||
            assessment.raw?.incompleteInitiatedByName ||
            "N/A";

        const initiatedOn =
            assessment.incompleteInitiatedOn ||
            assessment.raw?.incompleteInitiatedOn;

        return {
            label:
                "Incomplete",
            className:
                "status-incomplete",
            detail:
                `Incomplete mark • Initiated by ${initiatedBy}${initiatedOn
                    ? ` • ${formatDate(initiatedOn)}`
                    : ""}`
        };
    }

    const attestName =
        assessment.attestName ||
        assessment.raw?.attestName ||
        "N/A";

    const attestOn =
        assessment.attestOn ||
        assessment.raw?.attestOn;

    return {
        label:
            "Completed",
        className:
            "status-completed",
        detail:
            `Attested by ${attestName}${attestOn
                ? ` • ${formatDate(attestOn)}`
                : ""}`
    };
}

function formatDate(
    value
) {

    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;
    }

    return date.toLocaleDateString(
        undefined,
        {
            year:
                "numeric",
            month:
                "short",
            day:
                "2-digit"
        }
    );
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

    resultsRendered = false;

    activateResultsTab(
        "validation"
    );

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

async function startReview() {

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

    reviewResultsRendered = false;

    activateResultsTab(
        "review"
    );

    $("progressContainer")
        ?.classList.remove(
            "hidden"
        );

    $("retryFailedBtn")
        ?.classList.add(
            "hidden"
        );

    $("reviewBtn").disabled =
        true;

    await chrome.runtime.sendMessage({

        action:
            "START_REVIEW",

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

                    "validationError",

                    "reviewProgress",

                    "reviewComplete",

                    "reviewResults",

                    "reviewError"
                ]);

            if (
                data.validationProgress
            ) {

                renderProgress(
                    data.validationProgress
                );
            }

            if (
                data.validationComplete && !resultsRendered
            ) {

                validationResults =
                    data.validationResults || [];

                renderResults(
                    validationResults
                );

                resultsRendered = true;

                activateResultsTab(
                    "validation"
                );

                $("exportBtn")
                    ?.classList.remove(
                        "hidden"
                    );

                $("clearResultsBtn")
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
                data.reviewProgress &&
                !data.reviewComplete
            ) {

                renderProgress(
                    data.reviewProgress
                );
            }

            if (
                data.reviewComplete && !reviewResultsRendered
            ) {

                reviewResults =
                    data.reviewResults || [];

                renderReviewResults(
                    reviewResults
                );

                reviewResultsRendered = true;

                activateResultsTab(
                    "review"
                );

                $("reviewBtn").disabled =
                    false;

                $("clearReviewResultsBtn")
                    ?.classList.remove(
                        "hidden"
                    );
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

            if (
                data.reviewError
            ) {

                $("reviewBtn").disabled =
                    false;

                $("progressText").textContent =
                    data.reviewError;
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

function activateResultsTab(
    tab
) {

    activeResultsTab =
        tab === "review"
            ? "review"
            : "validation";

    $("validationTabBtn")
        ?.classList.toggle(
            "active",
            activeResultsTab === "validation"
        );

    $("reviewTabBtn")
        ?.classList.toggle(
            "active",
            activeResultsTab === "review"
        );

    $("resultsContainer")
        ?.classList.toggle(
            "hidden",
            activeResultsTab !== "validation"
        );

    $("reviewResultsContainer")
        ?.classList.toggle(
            "hidden",
            activeResultsTab !== "review"
        );

    updateResultActionVisibility();
}

function updateResultActionVisibility() {

    const hasValidationResults =
        validationResults &&
        validationResults.length > 0;

    const hasReviewResults =
        reviewResults &&
        reviewResults.length > 0;

    $("exportBtn")
        ?.classList.toggle(
            "hidden",
            activeResultsTab !== "validation" ||
            !hasValidationResults
        );

    $("clearResultsBtn")
        ?.classList.toggle(
            "hidden",
            activeResultsTab !== "validation" ||
            !hasValidationResults
        );

    $("clearReviewResultsBtn")
        ?.classList.toggle(
            "hidden",
            activeResultsTab !== "review" ||
            !hasReviewResults
        );
}

function renderResults(
    results
) {

    const container =
        $("validationCardsContainer");

    container.innerHTML = "";

    if (
        !results ||
        results.length === 0
    ) {
        updateResultActionVisibility();
        return;
    }

    results.forEach(
        result => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "result-card";

            const hasMissingQuestionError = result.results && result.results.some(
                rule => rule.reason === "Question identifier was not found in the survey questions."
            );

            const score = result.summary ? result.summary.score : null;
            const isLow = score !== null && score < 90;

            card.innerHTML = `

                <div class="result-header">

                    <strong>

                        ${result.assetName}

                    </strong>

                    <div style="display: flex; align-items: center; gap: 8px;">
                        ${hasMissingQuestionError ? `<span class="score-error-indicator" title="Question identifier was not found in the survey questions.">! Error</span>` : ""}
                        <span class="score-pill ${isLow ? 'score-low' : ''}">
                            ${result.summary ? `${score}%` : "Error"}
                        </span>
                    </div>

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

                        <div class="checkpoint-results-header">
                            <span>Checkpoint Details</span>
                            <button
                                class="download-context download-context-btn"
                                data-id="${result.assessmentId}"
                                title="Download Context"
                                aria-label="Download Context"
                            >
                                <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                            </button>
                        </div>

                        ${result.results.map(
                            rule => `

                            <div${rule.reason === "Question identifier was not found in the survey questions." ? ' class="rule-error-missing"' : ""}>

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

    updateResultActionVisibility();
}

function renderReviewResults(
    results
) {

    const container =
        $("reviewCardsContainer");

    container.innerHTML = "";

    if (
        !results ||
        results.length === 0
    ) {

        container.innerHTML =
            `<div class="review-empty">No review results yet.</div>`;

        updateResultActionVisibility();

        return;
    }

    results.forEach(
        result => {

            const card =
                document.createElement(
                    "div"
                );

            const statusClass =
                result.status === "Incomplete"
                    ? "status-incomplete"
                    : "status-completed";

            card.className =
                `review-card ${statusClass}`;

            const dateRows =
                result.status === "Incomplete"
                    ? `
                        <div><strong>Survey Completed On:</strong> ${result.surveyCompletedOnFormatted || "N/A"}</div>
                        <div><strong>Due On:</strong> ${result.dueOnFormatted || "N/A"}</div>
                        <div><strong>Incomplete Initiated On:</strong> ${result.incompleteInitiatedOnFormatted || "N/A"}</div>
                    `
                    : `
                        <div><strong>Survey Completed On:</strong> ${result.surveyCompletedOnFormatted || "N/A"}</div>
                        <div><strong>Due On:</strong> ${result.dueOnFormatted || "N/A"}</div>
                    `;

            card.innerHTML = `
                <div class="review-card-header">
                    <div class="review-card-title">
                        ${result.assetName || "Unknown Assessment"}
                        <span>Assessment ID: ${result.assessmentId || "N/A"}</span>
                    </div>
                    <span class="status-pill ${statusClass}">
                        ${result.status || "Completed"}
                    </span>
                </div>
                <div class="review-card-meta">
                    ${dateRows}
                    <div><strong>Review Items:</strong> ${result.workQueue ? result.workQueue.length : 0}</div>
                </div>
                ${result.error
                    ? `<div class="review-error">${result.error}</div>`
                    : `<button
                        class="btn-secondary review-notes-btn"
                        data-id="${result.assessmentId}"
                    >
                        Review Notes
                    </button>`}
            `;

            container.appendChild(
                card
            );
        }
    );

    document
        .querySelectorAll(
            ".review-notes-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => openReviewNotesModal(
                    button.dataset.id
                )
            );
        });

    updateResultActionVisibility();
}

function openReviewNotesModal(
    assessmentId
) {

    const result =
        reviewResults.find(
            item =>
                String(item.assessmentId) ===
                String(assessmentId)
        );

    if (
        !result ||
        result.error
    ) {
        return;
    }

    activeReviewNotes =
        result;

    $("reviewNotesTitle").textContent =
        result.assetName || "Review Notes";

    $("copyReviewNotesBtn").textContent =
        "Copy Review Output";

    $("reviewNotesMeta").innerHTML =
        result.notesMetaHtml || "";

    $("reviewNotesContent").innerHTML =
        result.reviewOutputHtml ||
        result.notesHtml ||
        "";

    $("reviewNotesModal")
        ?.classList.remove(
            "hidden"
        );
}

function closeReviewNotesModal() {

    $("reviewNotesModal")
        ?.classList.add(
            "hidden"
        );

    activeReviewNotes = null;
}

async function copyReviewNotes() {

    if (
        !activeReviewNotes
    ) {
        return;
    }

    const html =
        activeReviewNotes.reviewOutputHtml ||
        activeReviewNotes.notesHtml ||
        "";

    const text =
        activeReviewNotes.reviewOutputText ||
        activeReviewNotes.notesText ||
        $("reviewNotesContent")?.innerText ||
        "";

    const rtf =
        activeReviewNotes.reviewOutputRtf ||
        "";

    try {

        if (
            navigator.clipboard?.write &&
            window.ClipboardItem
        ) {

            const richPayload = {
                "text/html":
                    new Blob(
                        [html],
                        {
                            type:
                                "text/html"
                        }
                    ),
                "text/plain":
                    new Blob(
                        [text],
                        {
                            type:
                                "text/plain"
                        }
                    )
            };

            if (
                rtf
            ) {

                richPayload["text/rtf"] =
                    new Blob(
                        [rtf],
                        {
                            type:
                                "text/rtf"
                        }
                    );
            }

            try {

                await navigator.clipboard.write([
                    new ClipboardItem(
                        richPayload
                    )
                ]);

            } catch {

                await navigator.clipboard.write([
                    new ClipboardItem({
                    "text/html":
                        new Blob(
                            [html],
                            {
                                type:
                                    "text/html"
                            }
                        ),
                    "text/plain":
                        new Blob(
                            [text],
                            {
                                type:
                                    "text/plain"
                            }
                        )
                    })
                ]);
            }

        } else {

            await navigator.clipboard.writeText(
                text
            );
        }

        $("copyReviewNotesBtn").textContent =
            "Copied";

        setTimeout(
            () => {
                $("copyReviewNotesBtn").textContent =
                    "Copy Review Output";
            },
            1200
        );

    } catch {

        await navigator.clipboard.writeText(
            text
        );
    }
}

/*
====================================================
PREREQUISITES
====================================================
*/

function attachPrerequisiteOpenLinks() {

    const linksBySite =
        new Map(
            PREREQUISITE_CHECKS.map(
                check => [
                    check.id,
                    check.openUrl || check.url
                ]
            )
        );

    document
        .querySelectorAll(
            ".prereq-open-link"
        )
        .forEach(link => {

            const url =
                linksBySite.get(
                    link.dataset.site
                );

            if (!url) {
                return;
            }

            link.href =
                url;

            link.addEventListener(
                "click",
                event => {

                    event.preventDefault();
                    event.stopPropagation();

                    chrome.tabs.create({
                        url
                    });
                }
            );
        });
}

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

    reviewResults =
        await getReviewResults();

    if (
        validationResults &&
        validationResults.length
    ) {

        renderResults(
            validationResults
        );

        resultsRendered = true;

        $("exportBtn")
            ?.classList.remove(
                "hidden"
            );

        $("clearResultsBtn")
            ?.classList.remove(
                "hidden"
            );
    }

    if (
        reviewResults &&
        reviewResults.length
    ) {

        renderReviewResults(
            reviewResults
        );

        reviewResultsRendered = true;
    } else {

        renderReviewResults(
            []
        );
    }

    const stored =
        await chrome.storage.local.get(
            CONFIG.STORAGE_KEYS.LAST_ACTION
        );

    activateResultsTab(
        stored[CONFIG.STORAGE_KEYS.LAST_ACTION] === "review"
            ? "review"
            : "validation"
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
    }
}

async function clearValidationResults() {

    await chrome.runtime.sendMessage({

        action:
            "CLEAR_RESULTS"
    });

    validationResults = [];

    renderResults(
        validationResults
    );

    resultsRendered = false;

    $("retryFailedBtn")
        ?.classList.add(
            "hidden"
        );

    $("cancelBtn")
        ?.classList.add(
            "hidden"
        );

    $("progressContainer")
        ?.classList.add(
            "hidden"
        );

    $("progressFill").style.width =
        "0%";

    $("progressText").textContent =
        "Starting...";

    updateResultActionVisibility();
}

async function clearReviewResults() {

    await chrome.runtime.sendMessage({

        action:
            "CLEAR_REVIEW_RESULTS"
    });

    reviewResults = [];

    renderReviewResults(
        reviewResults
    );

    reviewResultsRendered = false;

    $("reviewBtn").disabled =
        false;

    updateResultActionVisibility();
}

async function retryFailedAssessments() {

    const failed =
        await getFailedAssessments();

    if (
        failed.length === 0
    ) {
        return;
    }

    resultsRendered = false;

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

/*
====================================================
SURVEY DIFF MODAL
====================================================
*/

async function setupSurveyDiffUI() {
    const icon    = $("whatsNewIcon");
    const modal   = $("surveyDiffModal");
    const closeBtn = $("closeModalBtn");
    const refreshBtn = $("refreshDiffBtn");
    const fromInput = $("surveyFromSearch");
    const toInput = $("surveyToSearch");
    const runBtn = $("runSurveyDiffBtn");

    if (!icon || !modal || !closeBtn) return;

    icon.addEventListener("click", async () => {
        modal.classList.remove("hidden");
        try {
            await restoreSurveyDiffModalState();
        } catch (error) {
            console.error("Survey diff modal restore error:", error);
            resetSurveyDiffSelection();
            renderSurveyDiff(null, "Unable to load survey versions.");
        }
    });

    closeBtn.addEventListener("click", () => {
        modal.classList.add("hidden");
    });

    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.add("hidden");
        }
    });

    if (refreshBtn) {
        refreshBtn.addEventListener(
            "click",
            refreshSurveyTemplateOptions
        );
    }

    fromInput?.addEventListener("focus", () => {
        renderSurveyVersionOptions("from");
        $("surveyFromOptions")?.classList.remove("hidden");
    });

    fromInput?.addEventListener("input", () => {
        selectedSurveyFrom = null;
        selectedSurveyTo = null;
        if (toInput) {
            toInput.value = "";
            toInput.disabled = true;
            toInput.placeholder = "Select From first";
        }
        updateSurveyDiffButton();
        clearSurveyDiffResults();
        saveSurveyDiffModalState({
            selectedFromId:
                null,
            selectedToId:
                null,
            diff:
                null
        });
        renderSurveyVersionOptions("from");
        $("surveyFromOptions")?.classList.remove("hidden");
    });

    toInput?.addEventListener("focus", () => {
        if (selectedSurveyFrom) {
            renderSurveyVersionOptions("to");
            $("surveyToOptions")?.classList.remove("hidden");
        }
    });

    toInput?.addEventListener("input", () => {
        selectedSurveyTo = null;
        updateSurveyDiffButton();
        clearSurveyDiffResults();
        saveSurveyDiffModalState({
            selectedFromId:
                selectedSurveyFrom?.surveyTemplateId || null,
            selectedToId:
                null,
            diff:
                null
        });
        renderSurveyVersionOptions("to");
        $("surveyToOptions")?.classList.remove("hidden");
    });

    runBtn?.addEventListener("click", runSelectedSurveyDiff);

    document.addEventListener("click", event => {
        if (!event.target.closest(".survey-combobox")) {
            $("surveyFromOptions")?.classList.add("hidden");
            $("surveyToOptions")?.classList.add("hidden");
        }
    });
}

async function getStoredSurveyDiffModalState() {
    const data =
        await chrome.storage.local.get(
            CONFIG.STORAGE_KEYS.WHATS_NEW_MODAL
        );

    return data[CONFIG.STORAGE_KEYS.WHATS_NEW_MODAL] || {};
}

async function saveSurveyDiffModalState(
    patch
) {

    const current =
        await getStoredSurveyDiffModalState();

    await chrome.storage.local.set({
        [CONFIG.STORAGE_KEYS.WHATS_NEW_MODAL]: {
            ...current,
            ...patch,
            updatedAt:
                Date.now()
        }
    });
}

function getSurveyTemplateById(
    surveyTemplateId
) {

    return surveyTemplates.find(
        template =>
            Number(template.surveyTemplateId) ===
            Number(surveyTemplateId)
    ) || null;
}

function renderSelectedSurveyVersions() {
    const fromInput =
        $("surveyFromSearch");

    const toInput =
        $("surveyToSearch");

    if (fromInput) {
        fromInput.value =
            selectedSurveyFrom
                ? formatSurveyOption(selectedSurveyFrom)
                : "";
    }

    if (toInput) {
        toInput.value =
            selectedSurveyTo
                ? formatSurveyOption(selectedSurveyTo)
                : "";

        toInput.disabled =
            !selectedSurveyFrom;

        toInput.placeholder =
            selectedSurveyFrom
                ? "Search newer versions..."
                : "Select From first";
    }

    updateSurveyDiffButton();
}

async function restoreSurveyDiffModalState() {
    const state =
        await getStoredSurveyDiffModalState();

    if (
        Array.isArray(state.templates) &&
        state.templates.length > 0
    ) {
        surveyTemplates =
            normalizeSurveyTemplates(
                state.templates
            );
    }

    if (surveyTemplates.length === 0) {
        resetSurveyDiffSelection();
        renderSurveyDiff(null, "Loading survey versions...");
        await loadSurveyTemplateOptions();
    }

    selectedSurveyFrom =
        state.selectedFromId
            ? getSurveyTemplateById(state.selectedFromId)
            : null;

    selectedSurveyTo =
        state.selectedToId
            ? getSurveyTemplateById(state.selectedToId)
            : null;

    if (
        selectedSurveyFrom &&
        selectedSurveyTo &&
        selectedSurveyTo.versionNumber <=
            selectedSurveyFrom.versionNumber
    ) {
        selectedSurveyTo = null;
    }

    renderSelectedSurveyVersions();
    renderSurveyVersionOptions("from");

    if (
        state.diff &&
        selectedSurveyFrom &&
        selectedSurveyTo
    ) {
        renderSurveyDiff(state.diff);
    } else {
        renderSurveyDiff(null, "Select a From and To version, then click What's New.");
    }
}

async function refreshSurveyTemplateOptions() {
    const refreshBtn =
        $("refreshDiffBtn");

    if (
        !refreshBtn ||
        refreshBtn.disabled
    ) {
        return;
    }

    refreshBtn.disabled = true;
    refreshBtn.setAttribute(
        "aria-busy",
        "true"
    );

    surveyDiffRequestId += 1;

    try {
        resetSurveyDiffSelection();
        clearSurveyDiffResults();
        await saveSurveyDiffModalState({
            selectedFromId:
                null,
            selectedToId:
                null,
            diff:
                null,
            templates:
                []
        });
        await loadSurveyTemplateOptions(true);
    } catch (error) {
        console.error("Survey template refresh error:", error);
        renderSurveyDiff(null, "Unable to load survey versions.");
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.removeAttribute(
            "aria-busy"
        );
    }
}

function normalizeSurveyTemplates(data) {
    const values =
        Array.isArray(data)
            ? data
            : Object.values(data || {});

    return values
        .filter(item =>
            item &&
            item.surveyTemplateId &&
            item.versionNumber !== undefined &&
            item.versionNumber !== null
        )
        .map(item => ({
            ...item,
            surveyTemplateId:
                Number(item.surveyTemplateId),
            versionNumber:
                Number(item.versionNumber)
        }))
        .filter(item =>
            !Number.isNaN(item.surveyTemplateId) &&
            !Number.isNaN(item.versionNumber)
        )
        .sort((a, b) =>
            b.versionNumber - a.versionNumber
        );
}

async function loadSurveyTemplateOptions(forceRefresh = false) {
    if (
        surveyTemplates.length > 0 &&
        !forceRefresh
    ) {
        renderSurveyVersionOptions("from");
        return;
    }

    if (!forceRefresh) {
        const state =
            await getStoredSurveyDiffModalState();

        if (
            Array.isArray(state.templates) &&
            state.templates.length > 0
        ) {
            surveyTemplates =
                normalizeSurveyTemplates(
                    state.templates
                );

            renderSurveyVersionOptions("from");
            return;
        }
    }

    if (forceRefresh) {
        surveyTemplates = [];
    }

    const fromInput =
        $("surveyFromSearch");

    if (fromInput) {
        fromInput.placeholder = "Loading versions...";
        fromInput.disabled = true;
    }

    try {
        surveyTemplates =
            normalizeSurveyTemplates(
                await getRiskProfilerSurveyTemplates()
            );

        await saveSurveyDiffModalState({
            templates:
                surveyTemplates
        });

        if (fromInput) {
            fromInput.disabled = false;
            fromInput.placeholder = "Search versions...";
        }

        renderSurveyVersionOptions("from");
    } catch (error) {
        console.error("Survey template load error:", error);

        if (fromInput) {
            fromInput.disabled = false;
            fromInput.placeholder = "Unable to load versions";
        }

        throw error;
    }
}

function resetSurveyDiffSelection() {
    selectedSurveyFrom = null;
    selectedSurveyTo = null;

    const fromInput =
        $("surveyFromSearch");

    const toInput =
        $("surveyToSearch");

    if (fromInput) {
        fromInput.value = "";
        fromInput.disabled = false;
        fromInput.placeholder = "Search versions...";
    }

    if (toInput) {
        toInput.value = "";
        toInput.disabled = true;
        toInput.placeholder = "Select From first";
    }

    $("surveyFromOptions")?.classList.add("hidden");
    $("surveyToOptions")?.classList.add("hidden");
    if ($("surveyFromOptions")) {
        $("surveyFromOptions").innerHTML = "";
    }
    if ($("surveyToOptions")) {
        $("surveyToOptions").innerHTML = "";
    }
    updateSurveyDiffButton();
}

function clearSurveyDiffResults() {
    const rangeEl =
        $("diffDateRange");

    const contentEl =
        $("diffContent");

    if (rangeEl) {
        rangeEl.textContent = "";
        rangeEl.classList.add("hidden");
    }

    if (contentEl) {
        contentEl.innerHTML = "";
    }
}

function formatSurveyOption(template) {
    const releaseDate =
        template.releasedOn
            ? formatDate(template.releasedOn)
            : "-";

    const deactivationDate =
        template.deactivatedOn
            ? formatDate(template.deactivatedOn)
            : "-";

    return `Version-${template.versionNumber} (Released on: ${releaseDate}, Deactivated on: ${deactivationDate})`;
}

function getSurveyOptions(kind) {
    if (kind === "to") {
        if (!selectedSurveyFrom) {
            return [];
        }

        return surveyTemplates.filter(
            template =>
                template.versionNumber >
                selectedSurveyFrom.versionNumber
        );
    }

    return surveyTemplates;
}

function renderSurveyVersionOptions(kind) {
    const input =
        kind === "from"
            ? $("surveyFromSearch")
            : $("surveyToSearch");

    const list =
        kind === "from"
            ? $("surveyFromOptions")
            : $("surveyToOptions");

    if (!input || !list) {
        return;
    }

    const query =
        input.value
            .trim()
            .toLowerCase();

    const options =
        getSurveyOptions(kind)
            .filter(template =>
                formatSurveyOption(template)
                    .toLowerCase()
                    .includes(query)
            );

    list.innerHTML = "";

    if (options.length === 0) {
        const empty =
            document.createElement("div");

        empty.className =
            "survey-option-empty";

        empty.textContent =
            surveyTemplates.length === 0
                ? "No survey versions found."
                : "No matching versions.";

        list.appendChild(empty);
        return;
    }

    options.forEach(template => {
        const option =
            document.createElement("button");

        option.type =
            "button";

        option.className =
            "survey-option";

        option.value =
            String(template.surveyTemplateId);

        option.textContent =
            formatSurveyOption(template);

        option.addEventListener("click", () => {
            selectSurveyVersion(kind, template);
        });

        list.appendChild(option);
    });
}

function selectSurveyVersion(kind, template) {
    if (kind === "from") {
        selectedSurveyFrom = template;
        selectedSurveyTo = null;

        const fromInput =
            $("surveyFromSearch");

        const toInput =
            $("surveyToSearch");

        if (fromInput) {
            fromInput.value =
                formatSurveyOption(template);
        }

        if (toInput) {
            toInput.value = "";
            toInput.disabled = false;
            toInput.placeholder = "Search newer versions...";
        }

        $("surveyFromOptions")?.classList.add("hidden");
        renderSurveyVersionOptions("to");
        clearSurveyDiffResults();
        saveSurveyDiffModalState({
            selectedFromId:
                template.surveyTemplateId,
            selectedToId:
                null,
            diff:
                null
        });
    } else {
        selectedSurveyTo = template;

        const toInput =
            $("surveyToSearch");

        if (toInput) {
            toInput.value =
                formatSurveyOption(template);
        }

        $("surveyToOptions")?.classList.add("hidden");
        clearSurveyDiffResults();
        saveSurveyDiffModalState({
            selectedFromId:
                selectedSurveyFrom?.surveyTemplateId || null,
            selectedToId:
                template.surveyTemplateId,
            diff:
                null
        });
    }

    updateSurveyDiffButton();
}

function updateSurveyDiffButton() {
    const runBtn =
        $("runSurveyDiffBtn");

    if (!runBtn) {
        return;
    }

    runBtn.classList.toggle(
        "hidden",
        !selectedSurveyFrom || !selectedSurveyTo
    );
}

async function runSelectedSurveyDiff() {
    if (
        !selectedSurveyFrom ||
        !selectedSurveyTo
    ) {
        return;
    }

    const runBtn =
        $("runSurveyDiffBtn");

    const requestId =
        surveyDiffRequestId + 1;

    surveyDiffRequestId =
        requestId;

    if (runBtn) {
        runBtn.disabled = true;
        runBtn.textContent = "Loading...";
    }

    try {
        const cachedState =
            await getStoredSurveyDiffModalState();

        if (
            cachedState.diff &&
            Number(cachedState.selectedFromId) ===
                Number(selectedSurveyFrom.surveyTemplateId) &&
            Number(cachedState.selectedToId) ===
                Number(selectedSurveyTo.surveyTemplateId)
        ) {
            renderSurveyDiff(cachedState.diff);
            return;
        }

        renderSurveyDiff(null, "Loading changes...");

        const diff =
            await surveyDifference(
                selectedSurveyFrom.surveyTemplateId,
                selectedSurveyTo.surveyTemplateId
            );

        if (
            requestId ===
            surveyDiffRequestId
        ) {
            renderSurveyDiff(diff);
            await saveSurveyDiffModalState({
                selectedFromId:
                    selectedSurveyFrom.surveyTemplateId,
                selectedToId:
                    selectedSurveyTo.surveyTemplateId,
                diff
            });
        }
    } catch (error) {
        console.error("Survey diff error:", error);
        if (
            requestId ===
            surveyDiffRequestId
        ) {
            renderSurveyDiff(null, "Unable to load survey differences.");
        }
    } finally {
        if (runBtn) {
            runBtn.disabled = false;
            runBtn.textContent = "What's New";
        }
    }
}

function renderSurveyDiff(diff, emptyMessage = "No changes detected between the selected survey templates.") {
    const rangeEl   = $("diffDateRange");
    const contentEl = $("diffContent");

    if (!rangeEl || !contentEl) return;

    contentEl.innerHTML = "";

    // No diff stored or no changes found
    if (
        !diff ||
        (diff.newQuestions.length === 0 &&
         diff.removedQuestions.length === 0 &&
         diff.modifiedQuestions.length === 0)
    ) {
        rangeEl.classList.add("hidden");
        const empty = document.createElement("div");
        empty.className = "diff-empty";
        empty.textContent = emptyMessage;
        contentEl.appendChild(empty);
        return;
    }

    const oldDate = diff.metadata.fromReleasedOn || diff.metadata.fromUpdatedOn
        ? formatDate(diff.metadata.fromReleasedOn || diff.metadata.fromUpdatedOn)
        : "Unknown";
    const newDate = diff.metadata.toReleasedOn || diff.metadata.toUpdatedOn
        ? formatDate(diff.metadata.toReleasedOn || diff.metadata.toUpdatedOn)
        : "Unknown";
    rangeEl.textContent = `From V-${diff.metadata.fromVersionNumber || diff.metadata.fromId} (${oldDate}) to V-${diff.metadata.toVersionNumber || diff.metadata.toId} (${newDate})`;
    rangeEl.classList.remove("hidden");

    // New questions
    diff.newQuestions.forEach(q => {
        const div = document.createElement("div");
        div.className = "diff-item";
        div.innerHTML = `
            <h4><span class="diff-tag new">New Question</span> <span class="diff-id">[${q.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${q.questionText || "—"}</div>
        `;
        contentEl.appendChild(div);
    });

    // Removed questions
    diff.removedQuestions.forEach(q => {
        const div = document.createElement("div");
        div.className = "diff-item";
        div.innerHTML = `
            <h4><span class="diff-tag removed">Removed Question</span> <span class="diff-id">[${q.alternateQuestionId}]</span></h4>
            <div class="diff-detail"><strong>Context:</strong> ${q.questionText || "—"}</div>
        `;
        contentEl.appendChild(div);
    });

    // Modified questions
    diff.modifiedQuestions.forEach(q => {
        const div = document.createElement("div");
        div.className = "diff-item";

        let tagsHTML    = "";
        let detailsHTML = "";

        if (q.textChanged) {
            tagsHTML    += `<span class="diff-tag changed">Question Changed</span>`;
            detailsHTML += `
                <div class="diff-detail"><strong>Old:</strong> ${q.textChanged.old}</div>
                <div class="diff-detail"><strong>New:</strong> ${q.textChanged.new}</div>
            `;
        }

        if (q.optionsChanged) {
            tagsHTML += `<span class="diff-tag changed">Options Changed</span>`;
            if (q.optionsChanged.added?.length > 0) {
                detailsHTML += `<div class="diff-detail"><strong>Added Options:</strong> ${q.optionsChanged.added.join(", ")}</div>`;
            }
            if (q.optionsChanged.removed?.length > 0) {
                detailsHTML += `<div class="diff-detail"><strong>Removed Options:</strong> ${q.optionsChanged.removed.join(", ")}</div>`;
            }
        }

        div.innerHTML = `
            <h4>${tagsHTML} <span class="diff-id">[${q.alternateQuestionId}]</span></h4>
            ${detailsHTML}
        `;
        contentEl.appendChild(div);
    });
}
