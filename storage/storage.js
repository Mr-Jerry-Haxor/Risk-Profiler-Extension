import { CONFIG } from "../utils/constants.js";

export async function getValue(key) {

    const result =
        await chrome.storage.local.get(key);

    return result[key];
}

export async function setValue(key, value) {

    await chrome.storage.local.set({
        [key]: value
    });
}

export async function removeValue(key) {

    await chrome.storage.local.remove(key);
}

export async function clearStorage() {

    await chrome.storage.local.clear();
}

export async function getSettings() {

    return (
        await getValue(
            CONFIG.STORAGE_KEYS.SETTINGS
        )
    ) || {};
}

export async function saveSettings(settings) {

    await setValue(
        CONFIG.STORAGE_KEYS.SETTINGS,
        settings
    );
}

export async function saveAssessments(
    assessments
) {

    await setValue(
        CONFIG.STORAGE_KEYS.ASSESSMENTS,
        assessments
    );
}

export async function getAssessments() {

    return (
        await getValue(
            CONFIG.STORAGE_KEYS.ASSESSMENTS
        )
    ) || [];
}

export async function saveValidationResults(
    results
) {

    await setValue(
        CONFIG.STORAGE_KEYS.VALIDATIONS,
        results
    );
}

export async function getValidationResults() {

    return (
        await getValue(
            CONFIG.STORAGE_KEYS.VALIDATIONS
        )
    ) || [];
}

export async function getFailedAssessments() {

    const result =
        await chrome.storage.local.get(
            "failedAssessments"
        );

    return result.failedAssessments || [];
}

export async function getContexts() {

    const result =
        await chrome.storage.local.get(
            "assessmentContexts"
        );

    return result.assessmentContexts || {};
}
