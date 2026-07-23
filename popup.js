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
    downloadReviewNotesDocx
}
from "./core/reviewNotesDocx.js";

import {
    CONFIG,
    ASA_MODE,
    PREREQUISITE_CHECKS,
    REVIEW_MODES
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

let applicationManagers = [];

let selectedApplicationManager = "";

let selectedAssessmentIds = [];

let validationResults = [];

let reviewResults = [];

let resultsRendered = false;

let reviewResultsRendered = false;

let activeResultsTab = "validation";

let activeReviewNotes = null;

let reviewQuestionSelections = {};

let reviewQuestionNotes = {};

let surveyTemplates = [];

let selectedSurveyFrom = null;

let selectedSurveyTo = null;

let surveyDiffRequestId = 0;

let selectedReviewMode = REVIEW_MODES.INITIAL;

let asaSettings = {
    enabled:
        false,
    emailTemplateEnabled:
        false,
    emailTemplateHtml:
        ""
};

const PLUGIN_LAYOUT_STORAGE_KEY = "pluginLayoutMode";

const DEFAULT_PLUGIN_LAYOUT = "popup";

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

    document.body.classList.toggle(
        "side-pane",
        new URLSearchParams(location.search).get("view") === "side-pane"
    );

    await loadPluginLayoutSetting();

    await loadAsaSettings();

    await loadAssessments();

    await loadReviewQuestionNotes();

    await loadReviewModeSetting();

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

async function loadPluginLayoutSetting() {

    const stored =
        await chrome.storage.local.get(
            PLUGIN_LAYOUT_STORAGE_KEY
        );

    const mode =
        stored[PLUGIN_LAYOUT_STORAGE_KEY] === "side-pane"
            ? "side-pane"
            : DEFAULT_PLUGIN_LAYOUT;

    const option =
        document.querySelector(
            `input[name="pluginLayout"][value="${mode}"]`
        );

    if (option) {

        option.checked = true;
    }
}

async function loadAsaSettings() {

    const section =
        $("asaSettingsSection");

    if (!ASA_MODE) {

        section?.classList.add(
            "hidden"
        );

        return;
    }

    section?.classList.remove(
        "hidden"
    );

    const stored =
        await chrome.storage.local.get(
            CONFIG.STORAGE_KEYS.ASA_SETTINGS
        );

    const value =
        stored[CONFIG.STORAGE_KEYS.ASA_SETTINGS] || {};

    asaSettings = {
        enabled:
            value.enabled === true,
        emailTemplateEnabled:
            value.emailTemplateEnabled === true,
        emailTemplateHtml:
            typeof value.emailTemplateHtml === "string"
                ? sanitizeRichText(
                    value.emailTemplateHtml
                )
                : ""
    };

    renderAsaSettings();
}

function renderAsaSettings() {

    if (!ASA_MODE) {

        return;
    }

    const asaToggle =
        $("asaModeToggle");

    const emailToggle =
        $("emailTemplateToggle");

    const editor =
        $("emailTemplateEditor");

    if (asaToggle) {

        asaToggle.checked =
            asaSettings.enabled;
    }

    if (emailToggle) {

        emailToggle.checked =
            asaSettings.emailTemplateEnabled;
    }

    if (
        editor &&
        editor.innerHTML !== asaSettings.emailTemplateHtml
    ) {

        editor.innerHTML =
            asaSettings.emailTemplateHtml;
    }

    $("emailTemplateSettings")
        ?.classList.toggle(
            "hidden",
            !asaSettings.enabled
        );

    $("emailTemplateEditorSection")
        ?.classList.toggle(
            "hidden",
            !asaSettings.enabled ||
            !asaSettings.emailTemplateEnabled
        );
}

function readAsaSettingsFromUi() {

    if (!ASA_MODE) {

        return asaSettings;
    }

    return {
        enabled:
            $("asaModeToggle")?.checked === true,
        emailTemplateEnabled:
            $("emailTemplateToggle")?.checked === true,
        emailTemplateHtml:
            sanitizeRichText(
                $("emailTemplateEditor")?.innerHTML || ""
            )
    };
}

function sanitizeRichText(
    html
) {

    const template =
        document.createElement(
            "template"
        );

    template.innerHTML =
        String(html || "");

    const allowed =
        new Set([
            "B",
            "STRONG",
            "I",
            "EM",
            "U",
            "BR",
            "DIV",
            "P",
            "UL",
            "OL",
            "LI"
        ]);

    [
        ...template.content.querySelectorAll(
            "*"
        )
    ].forEach(element => {

        if (!allowed.has(element.tagName)) {

            element.replaceWith(
                ...element.childNodes
            );

            return;
        }

        [
            ...element.attributes
        ].forEach(attribute =>
            element.removeAttribute(
                attribute.name
            )
        );
    });

    return template.innerHTML;
}

function updateTemplatePlaceholderDisplay() {

    const placeholder =
        $("templateVariableSelect")
            ?.value || "";

    const display =
        $("templatePlaceholderDisplay");

    const copyButton =
        $("copyTemplatePlaceholderBtn");

    if (display) {

        display.textContent =
            placeholder;
    }

    copyButton?.classList.toggle(
        "hidden",
        !placeholder
    );
}

async function copySelectedTemplatePlaceholder() {

    const placeholder =
        $("templateVariableSelect")
            ?.value || "";

    if (!placeholder) {

        return;
    }

    try {

        await navigator.clipboard.writeText(
            placeholder
        );

    } catch {

        const textarea =
            document.createElement(
                "textarea"
            );

        textarea.value =
            placeholder;

        document.body.appendChild(
            textarea
        );

        textarea.select();

        document.execCommand(
            "copy"
        );

        textarea.remove();
    }

    const button =
        $("copyTemplatePlaceholderBtn");

    if (!button) {

        return;
    }

    const original =
        button.textContent;

    button.textContent =
        "Copied";

    window.setTimeout(
        () => {

            button.textContent =
                original;
        },
        900
    );
}

function openLayoutSettingsModal() {

    $("layoutSettingsStatus").textContent =
        "";

    renderAsaSettings();

    $("layoutSettingsModal")
        ?.classList.remove(
            "hidden"
        );
}

function closeLayoutSettingsModal() {

    $("layoutSettingsModal")
        ?.classList.add(
            "hidden"
        );
}

async function savePluginLayoutSetting() {

    const selected =
        document.querySelector(
            'input[name="pluginLayout"]:checked'
        );

    const saveButton =
        $("saveLayoutSettingsBtn");

    const status =
        $("layoutSettingsStatus");

    if (!selected || !saveButton || !status) {

        return;
    }

    saveButton.disabled = true;
    status.textContent =
        "Applying layout…";

    try {

        const mode =
            selected.value === "side-pane"
                ? "side-pane"
                : DEFAULT_PLUGIN_LAYOUT;

        const response =
            await chrome.runtime.sendMessage({
                action:
                    "SET_PLUGIN_LAYOUT",
                mode
            });

        if (!response?.success) {

            throw new Error(
                response?.error ||
                "Unable to update the plugin layout."
            );
        }

        if (ASA_MODE) {

            asaSettings =
                readAsaSettingsFromUi();

            await chrome.storage.local.set({
                [CONFIG.STORAGE_KEYS.ASA_SETTINGS]:
                    asaSettings
            });
        }

        if (
            mode === "side-pane" &&
            !document.body.classList.contains(
                "side-pane"
            )
        ) {

            const currentWindow =
                await chrome.windows.getCurrent();

            await chrome.sidePanel.open({
                windowId:
                    currentWindow.id
            });
        }

        status.textContent =
            mode === "side-pane"
                ? "Side-pane mode is active."
                : "Pop-up mode is active.";

        renderReviewResults(
            reviewResults
        );

        window.setTimeout(
            closeLayoutSettingsModal,
            700
        );

    } catch (error) {

        status.textContent =
            error.message;

    } finally {

        saveButton.disabled = false;
    }
}

function populateOwnerFilter() {

    applicationManagers =
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

    updateOwnerOptions();
}

function renderOwnerOptions(
    owners
) {

    const ownerOptions =
        $("ownerOptions");

    if (!ownerOptions)
        return;

    ownerOptions.innerHTML =
        "";

    const allButton =
        document.createElement(
            "button"
        );

    allButton.type =
        "button";

    allButton.className =
        "manager-option";

    allButton.textContent =
        "All Application Managers";

    allButton.addEventListener(
        "click",
        () => {

            selectedApplicationManager =
                "";

            $("ownerSearchInput").value =
                "";

            hideOwnerOptions();

            applyFilters();
        }
    );

    ownerOptions.appendChild(
        allButton
    );

    owners.forEach(owner => {

        const option =
            document.createElement(
                "button"
            );

        option.type =
            "button";

        option.className =
            "manager-option";

        option.textContent =
            owner;

        option.addEventListener(
            "click",
            () => {

                selectedApplicationManager =
                    owner;

                $("ownerSearchInput").value =
                    owner;

                hideOwnerOptions();

                applyFilters();
            }
        );

        ownerOptions.appendChild(
            option
        );
    });
}

function getOwnerSearchRegex() {

    const pattern =
        $("ownerSearchInput")
            ?.value
            ?.trim() || "";

    if (!pattern)
        return null;

    try {

        return new RegExp(
            pattern,
            "i"
        );
    } catch {

        return null;
    }
}

function updateOwnerOptions() {

    const regex =
        getOwnerSearchRegex();

    const matchingOwners =
        regex
            ? applicationManagers.filter(
                owner =>
                    regex.test(owner)
            )
            : applicationManagers;

    renderOwnerOptions(
        matchingOwners
    );
}

function showOwnerOptions() {

    updateOwnerOptions();

    $("ownerOptions")
        ?.classList
        .remove("hidden");
}

function hideOwnerOptions() {

    $("ownerOptions")
        ?.classList
        .add("hidden");
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

    $("ownerSearchInput")
        ?.addEventListener(
            "focus",
            showOwnerOptions
        );

    $("ownerSearchInput")
        ?.addEventListener(
            "input",
            () => {

                selectedApplicationManager =
                    "";

                updateOwnerOptions();

                showOwnerOptions();

                applyFilters();
            }
        );

    $("ownerSearchInput")
        ?.addEventListener(
            "keydown",
            event => {

                if (event.key === "Escape") {

                    hideOwnerOptions();
                }
            }
        );

    document.addEventListener(
        "click",
        event => {

            const managerSearch =
                event.target.closest(
                    ".manager-search-select"
                );

            if (!managerSearch) {

                hideOwnerOptions();
            }
        }
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

    $("layoutSettingsBtn")
        ?.addEventListener(
            "click",
            openLayoutSettingsModal
        );

    $("closeLayoutSettingsBtn")
        ?.addEventListener(
            "click",
            closeLayoutSettingsModal
        );

    $("layoutSettingsModal")
        ?.addEventListener(
            "click",
            event => {

                if (event.target.id === "layoutSettingsModal") {

                    closeLayoutSettingsModal();
                }
            }
        );

    $("saveLayoutSettingsBtn")
        ?.addEventListener(
            "click",
            savePluginLayoutSetting
        );

    $("asaModeToggle")
        ?.addEventListener(
            "change",
            () => {

                asaSettings =
                    readAsaSettingsFromUi();

                renderAsaSettings();
            }
        );

    $("emailTemplateToggle")
        ?.addEventListener(
            "change",
            () => {

                asaSettings =
                    readAsaSettingsFromUi();

                renderAsaSettings();
            }
        );

    document
        .querySelectorAll(
            "[data-rich-command]"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    $("emailTemplateEditor")
                        ?.focus();

                    document.execCommand(
                        button.dataset.richCommand,
                        false
                    );
                }
            );
        });

    $("templateVariableSelect")
        ?.addEventListener(
            "change",
            updateTemplatePlaceholderDisplay
        );

    $("copyTemplatePlaceholderBtn")
        ?.addEventListener(
            "click",
            copySelectedTemplatePlaceholder
        );

    $("reviewBtn")
        ?.addEventListener(
            "click",
            startReview
        );

    $("reviewSettingsBtn")
        ?.addEventListener(
            "click",
            openReviewSettingsModal
        );

    $("scrollToggleBtn")
        ?.addEventListener(
            "click",
            handleScrollToggle
        );

    window.addEventListener(
        "scroll",
        updateScrollToggleButton,
        {
            passive:
                true
        }
    );

    window.addEventListener(
        "resize",
        updateScrollToggleButton
    );

    if (
        typeof ResizeObserver !== "undefined"
    ) {
        new ResizeObserver(
            updateScrollToggleButton
        ).observe(
            document.body
        );
    }

    $("closeReviewSettingsModalBtn")
        ?.addEventListener(
            "click",
            closeReviewSettingsModal
        );

    $("reviewSettingsModal")
        ?.addEventListener(
            "click",
            event => {

                if (
                    event.target ===
                    $("reviewSettingsModal")
                ) {
                    closeReviewSettingsModal();
                }
            }
        );

    $("saveReviewSettingsBtn")
        ?.addEventListener(
            "click",
            saveReviewModeSetting
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

    $("cancelReviewBtn")
        ?.addEventListener(
            "click",
            async () => {

                await chrome.runtime.sendMessage({

                    action:
                        "STOP_REVIEW"
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

    $("selectAllReviewNotesBtn")
        ?.addEventListener(
            "click",
            toggleAllReviewQuestions
        );

    $("downloadReviewNotesBtn")
        ?.addEventListener(
            "click",
            downloadActiveReviewNotes
        );

    attachPrerequisiteOpenLinks();

    updateScrollToggleButton();
}

function getScrollMetrics() {

    const scrollTop =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

    const scrollHeight =
        Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight
        );

    const clientHeight =
        window.innerHeight ||
        document.documentElement.clientHeight;

    const maxScroll =
        Math.max(
            0,
            scrollHeight - clientHeight
        );

    return {
        scrollTop,
        maxScroll
    };
}

function shouldScrollToTop() {

    const {
        scrollTop,
        maxScroll
    } =
        getScrollMetrics();

    if (
        maxScroll <= 0
    ) {
        return false;
    }

    return scrollTop >=
        maxScroll / 2;
}

function updateScrollToggleButton() {

    const button =
        $("scrollToggleBtn");

    if (!button) {
        return;
    }

    const {
        maxScroll
    } =
        getScrollMetrics();

    const scrollUp =
        shouldScrollToTop();

    button.classList.toggle(
        "scroll-up",
        scrollUp
    );

    button.title =
        scrollUp
            ? "Scroll to top"
            : "Scroll to bottom";

    button.setAttribute(
        "aria-label",
        button.title
    );

    button.disabled =
        maxScroll <= 0;
}

function handleScrollToggle() {

    const {
        maxScroll
    } =
        getScrollMetrics();

    window.scrollTo({
        top:
            shouldScrollToTop()
                ? 0
                : maxScroll,
        behavior:
            "smooth"
    });
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

    if (selectedApplicationManager) {

        filteredAssessments =
            filteredAssessments.filter(
                x =>
                    x.appMgrName ===
                    selectedApplicationManager
            );
    } else {

        const ownerRegex =
            getOwnerSearchRegex();

        if (ownerRegex) {

            filteredAssessments =
                filteredAssessments.filter(
                    x =>
                        ownerRegex.test(
                            x.appMgrName || ""
                        )
                );
        }
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

    $("ownerSearchInput").value = "";

    selectedApplicationManager =
        "";

    updateOwnerOptions();

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
                        ${assessmentDateInfoHtml(assessment)}
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

function assessmentDateInfoHtml(
    assessment
) {

    const dueOn =
        formatDate(
            assessment.dueOn ||
            assessment.raw?.dueOn
        ) || "N/A";

    if (
        isIncompleteAssessment(
            assessment
        )
    ) {

        const initiatedOn =
            formatDate(
                assessment.incompleteInitiatedOn ||
                assessment.raw?.incompleteInitiatedOn
            ) || "N/A";

        return `<strong>Incomplete initiated date:</strong> ${initiatedOn} • <strong>Due on:</strong> ${dueOn}`;
    }

    const surveyCompletedOn =
        formatDate(
            assessment.surveyCompletedOn ||
            assessment.raw?.surveyCompletedOn
        ) || "N/A";

    return `<strong>Due on:</strong> ${dueOn} • <strong>Survey Completed(Last):</strong> ${surveyCompletedOn}`;
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

    $("cancelReviewBtn")
        ?.classList.add(
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

    renderProgress({
        completed:
            0,
        total:
            selected.length,
        current:
            "Starting review",
        startedAt:
            Date.now(),
        type:
            "review"
    });

    $("cancelReviewBtn")
        ?.classList.remove(
            "hidden"
        );

    $("cancelBtn")
        ?.classList.add(
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
            selected,

        reviewConfig: {
            mode:
                selectedReviewMode
        }
    });
}

async function loadReviewModeSetting() {

    const data =
        await chrome.storage.local.get(
            CONFIG.STORAGE_KEYS.REVIEW_MODE
        );

    const storedMode =
        data[CONFIG.STORAGE_KEYS.REVIEW_MODE];

    selectedReviewMode =
        Object.values(REVIEW_MODES)
            .includes(storedMode)
            ? storedMode
            : REVIEW_MODES.INITIAL;

    renderReviewModeSetting();
}

function renderReviewModeSetting() {

    document
        .querySelectorAll("input[name='reviewMode']")
        .forEach(input => {

            input.checked =
                input.value === selectedReviewMode;
        });
}

function openReviewSettingsModal() {

    renderReviewModeSetting();

    $("reviewSettingsModal")
        ?.classList.remove(
            "hidden"
        );
}

function closeReviewSettingsModal() {

    $("reviewSettingsModal")
        ?.classList.add(
            "hidden"
        );
}

async function saveReviewModeSetting() {

    const selectedInput =
        document.querySelector(
            "input[name='reviewMode']:checked"
        );

    const nextMode =
        Object.values(REVIEW_MODES)
            .includes(selectedInput?.value)
            ? selectedInput.value
            : REVIEW_MODES.INITIAL;

    selectedReviewMode =
        nextMode;

    await chrome.storage.local.set({
        [CONFIG.STORAGE_KEYS.REVIEW_MODE]:
            selectedReviewMode
    });

    closeReviewSettingsModal();
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

                    "reviewError",

                    CONFIG.STORAGE_KEYS.LAST_ACTION
                ]);

            const lastAction =
                data[CONFIG.STORAGE_KEYS.LAST_ACTION] ||
                activeResultsTab;

            if (
                lastAction === "validation" &&
                data.validationProgress &&
                !data.validationComplete
            ) {

                renderProgress(
                    data.validationProgress,
                    "validation"
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

                renderProgress(
                    data.validationProgress,
                    "validation"
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
                lastAction === "review" &&
                data.reviewProgress &&
                !data.reviewComplete
            ) {

                renderProgress(
                    data.reviewProgress,
                    "review"
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

                renderProgress(
                    data.reviewProgress,
                    "review"
                );

                $("cancelReviewBtn")
                    ?.classList.add(
                        "hidden"
                    );

                $("clearReviewResultsBtn")
                    ?.classList.remove(
                        "hidden"
                    );
            }

            if (
                lastAction === "validation" &&
                data.validationError &&
                !data.validationProgress
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

                $("cancelReviewBtn")
                    ?.classList.add(
                        "hidden"
                    );
            }

        },
        1000
    );
}

function renderProgress(
    progress,
    type = activeResultsTab
) {

    if (
        !progress ||
        !progress.total
    ) {
        return;
    }

    const percent =
        Math.round(
            (
                progress.completed /
                progress.total
            ) * 100
        );

    const now =
        progress.completedAt ||
        Date.now();

    const startedAt =
        progress.startedAt ||
        now;

    const elapsedMs =
        Math.max(
            0,
            now - startedAt
        );

    const isComplete =
        progress.completed >= progress.total;

    const estimatedText =
        !isComplete && progress.completed > 0
            ? formatDuration(
                Math.max(
                    0,
                    (
                        elapsedMs /
                        progress.completed
                    ) *
                    (
                        progress.total -
                        progress.completed
                    )
                )
            )
            : !isComplete
                ? "Calculating"
                : "Complete";

    const label =
        type === "review"
            ? "Review"
            : "Validation";

    const current =
        progress.current &&
        !String(progress.current)
            .toLowerCase()
            .includes("completed")
            ? ` • Current: ${progress.current}`
            : "";

    $("progressText").textContent =

        isComplete
            ? `${label} complete: ${progress.completed}/${progress.total} processed • Time Elapsed: ${formatDuration(elapsedMs)} • Estimated Time: Complete`
            : `${label} in progress: ${progress.completed}/${progress.total} processed${current} • Time Elapsed: ${formatDuration(elapsedMs)} • Estimated Time: ${estimatedText}`;

    $("progressFill").style.width =
        `${percent}%`;
}

function formatDuration(
    valueMs
) {

    const totalSeconds =
        Math.max(
            0,
            Math.round(valueMs / 1000)
        );

    if (
        totalSeconds < 60
    ) {
        return `${totalSeconds}s`;
    }

    const minutes =
        Math.floor(totalSeconds / 60);

    const seconds =
        totalSeconds % 60;

    return `${minutes}m ${seconds}s`;
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
                        <div><strong>Incomplete Initiated On:</strong> ${result.incompleteInitiatedOnFormatted || "N/A"}</div>
                        <div><strong>Due On:</strong> ${result.dueOnFormatted || "N/A"}</div>
                    `
                    : `
                        <div><strong>Due On:</strong> ${result.dueOnFormatted || "N/A"}</div>
                    `;

            const showEmailAction =
                ASA_MODE &&
                asaSettings.enabled &&
                asaSettings.emailTemplateEnabled &&
                Boolean(
                    asaSettings.emailTemplateHtml
                        .replace(
                            /<[^>]*>/g,
                            ""
                        )
                        .trim()
                );

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
                    : `<div class="review-card-actions">
                        <button
                            class="btn-secondary review-notes-btn"
                            data-id="${result.assessmentId}"
                        >
                            Review Notes
                        </button>
                        ${showEmailAction
                            ? `<button
                                class="btn-secondary send-review-email-btn"
                                data-id="${result.assessmentId}"
                            >
                                Send Email
                            </button>`
                            : ""}
                    </div>`}
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

    document
        .querySelectorAll(
            ".send-review-email-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => openReviewEmail(
                    button.dataset.id
                )
            );
        });

    updateResultActionVisibility();
}

function replaceTemplatePlaceholders(
    template,
    review
) {

    const replacements = {
        "{{ASSET_NAME}}":
            escapeTemplateHtmlValue(
                review.assetName
            ),
        "{{ASSET_ID}}":
            escapeTemplateHtmlValue(
                review.assetId
            ),
        "{{DUE_DATE}}":
            escapeTemplateHtmlValue(
                review.dueOnFormatted
            ),
        "{{LAST_SURVEY_COMPLETED_ON}}":
            escapeTemplateHtmlValue(
                review.surveyCompletedOnFormatted
            ),
        "{{INCOMPLETE_ASSESSMENT_ID}}":
            escapeTemplateHtmlValue(
                review.incompleteAssessmentId
            )
    };

    return Object.entries(
        replacements
    ).reduce(
        (
            resolved,
            [
                placeholder,
                value
            ]
        ) =>
            resolved.split(
                placeholder
            ).join(
                String(value)
            ),
        String(template || "")
    );
}

function escapeTemplateHtmlValue(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#39;"
        );
}

function richTextToPlainText(
    html
) {

    const container =
        document.createElement(
            "div"
        );

    container.innerHTML =
        sanitizeRichText(
            html
        );

    container
        .querySelectorAll(
            "br"
        )
        .forEach(element =>
            element.replaceWith(
                "\n"
            )
        );

    container
        .querySelectorAll(
            "li"
        )
        .forEach(element => {

            element.prepend(
                "• "
            );

            element.append(
                "\n"
            );
        });

    container
        .querySelectorAll(
            "p, div"
        )
        .forEach(element =>
            element.append(
                "\n"
            )
        );

    return (
        container.textContent || ""
    )
        .replace(
            /\n{3,}/g,
            "\n\n"
        )
        .trim();
}

function validReviewRecipientEmails(
    review
) {

    const allowedRoles =
        new Set([
            "ApplicationManager",
            "BusinessSystemManager"
        ]);

    return [
        ...new Set(
            (review.contacts || [])
                .filter(contact =>
                    allowedRoles.has(
                        contact.roleName
                    )
                )
                .map(contact =>
                    String(
                        contact.email || ""
                    ).trim()
                )
                .filter(email =>
                    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                        email
                    )
                )
        )
    ];
}

async function openReviewEmail(
    assessmentId
) {

    const review =
        reviewResults.find(
            result =>
                String(result.assessmentId) ===
                String(assessmentId)
        );

    if (!review) {

        return;
    }

    const recipients =
        validReviewRecipientEmails(
            review
        );

    if (recipients.length === 0) {

        window.alert(
            "No valid Application Manager or Business System Manager email address was found for this assessment."
        );

        return;
    }

    const resolvedHtml =
        replaceTemplatePlaceholders(
            asaSettings.emailTemplateHtml,
            review
        );

    const body =
        richTextToPlainText(
            resolvedHtml
        );

    const subject =
        `${review.assetName || "Assessment"} Risk Profiler Review`;

    const emailUrl =
        `mailto:${recipients.map(
            address =>
                encodeURIComponent(
                    address
                )
        ).join(",")}?subject=${encodeURIComponent(
            subject
        )}&body=${encodeURIComponent(
            body
        )}`;

    await chrome.tabs.create({
        url:
            emailUrl
    });
}

async function downloadActiveReviewNotes() {

    if (
        !activeReviewNotes ||
        activeReviewNotes.error
    ) {
        return;
    }

    const selectedWorkQueue =
        getSelectedReviewWorkQueue(
            activeReviewNotes
        );

    if (
        selectedWorkQueue.length === 0
    ) {
        return;
    }

    await downloadReviewNotesDocx(
        {
            ...activeReviewNotes,
            workQueue:
                selectedWorkQueue
        }
    );
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

    $("reviewNotesMeta").innerHTML =
        result.notesMetaHtml || "";

    renderReviewBasisInfo(
        result
    );

    ensureReviewSelection(
        result
    );

    renderActiveReviewNotesContent();

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

function renderReviewBasisInfo(
    result
) {

    const tooltip =
        $("reviewBasisTooltip");

    const icon =
        $("reviewBasisInfo");

    if (
        !tooltip ||
        !icon
    ) {
        return;
    }

    const basis =
        result.reviewBasis || {};

    const reviewMode =
        formatReviewModeLabel(
            basis.reviewMode ||
            result.reviewMode
        );

    const behavior =
        basis.assessmentBehavior ||
        (
            result.status === "Incomplete"
                ? "Incomplete assessment review uses the incomplete survey template."
                : "Completed assessment review uses the latest released survey template."
        );

    const newAnswersUsed =
        basis.newAnswersUsed === true
            ? "Yes"
            : "No";

    tooltip.innerHTML = `
        <div><strong>Review mode:</strong> ${escapeHtml(reviewMode)}</div>
        <div><strong>Behavior:</strong> ${escapeHtml(behavior)}</div>
        <div><strong>Old survey template ID:</strong> ${escapeHtml(basis.oldSurveyTemplateId || result.oldSurveyTemplateId || "N/A")}</div>
        <div><strong>New survey template ID:</strong> ${escapeHtml(basis.newSurveyTemplateId || result.newSurveyTemplateId || "N/A")}</div>
        <div><strong>newAnswers used:</strong> ${escapeHtml(newAnswersUsed)}</div>
    `;

    icon.classList.toggle(
        "hidden",
        false
    );
}

function formatReviewModeLabel(
    mode
) {

    if (
        mode === "selectedAnswers"
    ) {
        return "Review Based on Selected Answers";
    }

    return "Initial Review Mode";
}

function reviewReachabilityInfoHtml(
    reason
) {

    return `
        <span
            class="review-hover-info review-route-info"
            tabindex="0"
            aria-label="Reachability reason"
        >
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.1" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="6" cy="6" r="2"></circle>
                <circle cx="18" cy="18" r="2"></circle>
                <path d="M8 6h3a3 3 0 0 1 3 3v6"></path>
                <path d="m11 12 3 3 3-3"></path>
            </svg>
            <span class="review-hover-panel review-route-panel" role="tooltip">
                ${escapeHtml(reason)}
            </span>
        </span>
    `;
}

async function loadReviewQuestionNotes() {

    const data =
        await chrome.storage.local.get(
            "reviewQuestionNotes"
        );

    reviewQuestionNotes =
        data.reviewQuestionNotes || {};
}

async function saveReviewQuestionNotes() {

    await chrome.storage.local.set({
        reviewQuestionNotes
    });
}

function ensureReviewSelection(
    review
) {

    const assessmentKey =
        getReviewAssessmentKey(
            review
        );

    if (
        reviewQuestionSelections[assessmentKey]
    ) {
        return;
    }

    reviewQuestionSelections[assessmentKey] =
        (review.workQueue || [])
            .map((item, index) =>
                getReviewQuestionKey(
                    item,
                    index
                )
            );
}

function renderActiveReviewNotesContent() {

    const container =
        $("reviewNotesContent");

    if (
        !container ||
        !activeReviewNotes
    ) {
        return;
    }

    const workQueue =
        activeReviewNotes.workQueue || [];

    if (
        workQueue.length === 0
    ) {

        container.innerHTML =
            `<div class="review-output-empty">No reachable unanswered work queue items were found.</div>`;

        updateReviewDownloadState();

        return;
    }

    const assessmentKey =
        getReviewAssessmentKey(
            activeReviewNotes
        );

    const selected =
        new Set(
            reviewQuestionSelections[assessmentKey] || []
        );

    container.innerHTML =
        workQueue.map((item, index) =>
            reviewQuestionCardHtml(
                item,
                index,
                selected.has(
                    getReviewQuestionKey(
                        item,
                        index
                    )
                )
            )
        ).join("");

    attachReviewQuestionEvents();

    updateReviewDownloadState();
}

function reviewQuestionCardHtml(
    item,
    index,
    checked
) {

    const key =
        getReviewQuestionKey(
            item,
            index
        );

    const note =
        getReviewQuestionNote(
            activeReviewNotes,
            item,
            index
        );

    const options =
        reviewOptionListHtml(
            item
        );

    const reachabilityInfo =
        item.reachabilityReason
            ? reviewReachabilityInfoHtml(
                item.reachabilityReason
            )
            : "";

    return `
        <section class="review-output-item" data-question-key="${escapeHtml(key)}">
            <div class="review-question-toolbar">
                <label class="review-question-select">
                    <input
                        type="checkbox"
                        class="review-question-checkbox"
                        data-key="${escapeHtml(key)}"
                        ${checked ? "checked" : ""}
                    >
                    <span>Select for download</span>
                </label>
                <div class="review-question-icon-actions">
                    ${reachabilityInfo}
                    <button
                        type="button"
                        class="review-note-icon-btn"
                        data-key="${escapeHtml(key)}"
                        title="ASA Notes"
                        aria-label="ASA Notes"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"></path>
                        </svg>
                    </button>
                </div>
            </div>
            ${item.status
                ? `<div class="review-output-status">${escapeHtml(item.status)}</div>`
                : ""}
            <div class="review-output-id-row">
                <div><strong>Category:</strong> <span>${escapeHtml(item.questionGroup || "N/A")}</span></div>
                <div><strong>Question ID:</strong> <span>${escapeHtml(item.questionId || "N/A")}</span></div>
            </div>
            <div class="review-output-field">
                <strong>Question:</strong>
                <span>${escapeHtml(item.question || "N/A")}</span>
            </div>
            <div class="review-output-field">
                <strong>Answer Type:</strong>
                <span>${escapeHtml(item.answerType || "N/A")}</span>
            </div>
            <div class="review-output-field">
                <strong>Options:</strong>
                <ul>${options}</ul>
            </div>
            <div class="review-asa-note ${note ? "" : "hidden"}" data-note-preview="${escapeHtml(key)}">
                <strong>ASA Notes:</strong>
                <span>${escapeHtml(note)}</span>
            </div>
            <div class="review-note-editor hidden" data-note-editor="${escapeHtml(key)}">
                <textarea
                    class="review-note-input"
                    data-note-input="${escapeHtml(key)}"
                    placeholder="Write ASA notes for this question..."
                >${escapeHtml(note)}</textarea>
                <button
                    type="button"
                    class="btn-secondary review-note-save-btn"
                    data-key="${escapeHtml(key)}"
                >
                    Save Notes
                </button>
            </div>
        </section>
    `;
}

function attachReviewQuestionEvents() {

    document
        .querySelectorAll(
            ".review-question-checkbox"
        )
        .forEach(checkbox => {

            checkbox.addEventListener(
                "change",
                () => {

                    setReviewQuestionSelected(
                        checkbox.dataset.key,
                        checkbox.checked
                    );

                    updateReviewDownloadState();
                }
            );
        });

    document
        .querySelectorAll(
            ".review-note-icon-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => toggleReviewNoteEditor(
                    button.dataset.key
                )
            );
        });

    document
        .querySelectorAll(
            ".review-note-save-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => saveReviewNoteFromEditor(
                    button.dataset.key
                )
            );
        });
}

function setReviewQuestionSelected(
    questionKey,
    selected
) {

    const assessmentKey =
        getReviewAssessmentKey(
            activeReviewNotes
        );

    const values =
        new Set(
            reviewQuestionSelections[assessmentKey] || []
        );

    if (
        selected
    ) {
        values.add(
            questionKey
        );
    } else {
        values.delete(
            questionKey
        );
    }

    reviewQuestionSelections[assessmentKey] =
        [...values];
}

function toggleAllReviewQuestions() {

    if (
        !activeReviewNotes
    ) {
        return;
    }

    const assessmentKey =
        getReviewAssessmentKey(
            activeReviewNotes
        );

    const keys =
        (activeReviewNotes.workQueue || [])
            .map((item, index) =>
                getReviewQuestionKey(
                    item,
                    index
                )
            );

    const selected =
        reviewQuestionSelections[assessmentKey] || [];

    reviewQuestionSelections[assessmentKey] =
        selected.length === keys.length
            ? []
            : keys;

    renderActiveReviewNotesContent();
}

function updateReviewDownloadState() {

    const button =
        $("downloadReviewNotesBtn");

    const selectAllButton =
        $("selectAllReviewNotesBtn");

    if (
        !button ||
        !activeReviewNotes
    ) {
        return;
    }

    const total =
        (activeReviewNotes.workQueue || []).length;

    const selected =
        getSelectedReviewWorkQueue(
            activeReviewNotes
        ).length;

    button.textContent =
        `Download Review Notes (${selected}/${total})`;

    button.disabled =
        selected === 0;

    if (
        selectAllButton
    ) {
        selectAllButton.textContent =
            selected === total && total > 0
                ? "Deselect All"
                : "Select All";

        selectAllButton.disabled =
            total === 0;
    }
}

function getSelectedReviewWorkQueue(
    review
) {

    const assessmentKey =
        getReviewAssessmentKey(
            review
        );

    const selected =
        new Set(
            reviewQuestionSelections[assessmentKey] || []
        );

    return (review.workQueue || [])
        .map((item, index) => ({
            item,
            index,
            key:
                getReviewQuestionKey(
                    item,
                    index
                )
        }))
        .filter(entry =>
            selected.has(
                entry.key
            )
        )
        .map(entry => ({
            ...entry.item,
            asaNotes:
                getReviewQuestionNote(
                    review,
                    entry.item,
                    entry.index
                )
        }));
}

function toggleReviewNoteEditor(
    questionKey
) {

    const editor =
        document.querySelector(
            `[data-note-editor="${cssEscape(questionKey)}"]`
        );

    editor
        ?.classList.toggle(
            "hidden"
        );
}

async function saveReviewNoteFromEditor(
    questionKey
) {

    const input =
        document.querySelector(
            `[data-note-input="${cssEscape(questionKey)}"]`
        );

    const note =
        input?.value.trim() || "";

    const assessmentKey =
        getReviewAssessmentKey(
            activeReviewNotes
        );

    if (
        !reviewQuestionNotes[assessmentKey]
    ) {
        reviewQuestionNotes[assessmentKey] = {};
    }

    reviewQuestionNotes[assessmentKey][questionKey] =
        note;

    await saveReviewQuestionNotes();

    renderActiveReviewNotesContent();
}

function getReviewQuestionNote(
    review,
    item,
    index
) {

    const assessmentKey =
        getReviewAssessmentKey(
            review
        );

    const questionKey =
        getReviewQuestionKey(
            item,
            index
        );

    return reviewQuestionNotes[assessmentKey]?.[questionKey] || "";
}

function getReviewAssessmentKey(
    review
) {

    return String(
        review?.assessmentId || "active"
    );
}

function getReviewQuestionKey(
    item,
    index
) {

    return String(
        item?.surveyTemplateQuestionId ||
        item?.questionId ||
        `question-${index}`
    );
}

function reviewOptionText(
    option
) {

    return option.internalValue ||
        option.displayValue ||
        "<no options>";
}

function reviewOptionListHtml(
    item
) {

    const options =
        (item.options || []).length
            ? item.options
            : [
                {
                    internalValue:
                        "<no options>"
                }
            ];

    const checkboxType =
        String(
            item.answerType || ""
        ).toLowerCase() === "multi select"
            ? "checkbox"
            : "radio";

    const checkboxClass =
        checkboxType === "checkbox"
            ? "review-option-checkbox-square"
            : "review-option-checkbox-circle";

    return options
        .map(option => `
            <li class="review-option-row">
                <input
                    type="${checkboxType}"
                    class="review-option-checkbox ${checkboxClass}"
                    disabled
                    aria-hidden="true"
                >
                <span>${escapeHtml(reviewOptionText(option))}</span>
            </li>
        `)
        .join("");
}

function escapeHtml(
    value
) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function cssEscape(
    value
) {

    if (
        window.CSS?.escape
    ) {
        return CSS.escape(
            value
        );
    }

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, "\\\"");
}

async function copyReviewNotes() {

    if (
        !activeReviewNotes
    ) {
        return;
    }

    const html =
        activeReviewNotes.reviewOutputCopyHtml ||
        activeReviewNotes.reviewOutputHtml ||
        activeReviewNotes.notesHtml ||
        "";

    const htmlDocument =
        `<!doctype html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;

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
                        [htmlDocument],
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
                            [htmlDocument],
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

    $("cancelReviewBtn")
        ?.classList.add(
            "hidden"
        );

    closeReviewNotesModal();

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

    renderProgress({
        completed:
            0,
        total:
            failed.length,
        current:
            "Starting validation",
        startedAt:
            Date.now()
    });

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
