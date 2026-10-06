import { fetchJson } from "./requestManager.js";
import { getAssessmentAnswers } from "./cairoApi.js";
import { URLS } from "../utils/constants.js";
import { normalizeAnswersByAlternateQuestionId } from "../core/answerUtils.js";
import { extractAnswerValues, normalize } from "../checkpoints/helpers.js";

// Only exact asset-name matches are evidence for this application's RP11.
export async function getAcpServiceAccountEvidence(assetName) {
    try {
        if (typeof assetName !== "string" || !assetName.trim()) throw new Error("Application asset name is missing.");
        const response = await fetchJson(URLS.ACP_ASSESSMENTS);
        const rows = Array.isArray(response) ? response : response?.data;
        if (!Array.isArray(rows)) throw new Error("ACP assessment list is not a valid array.");
        const matches = rows.filter(row => row?.assetName === assetName);
        if (!matches.length) return { status: "no-match", assetName };
        if (matches.length !== 1) throw new Error(`Found ${matches.length} exact ACP asset-name matches; assessment selection is ambiguous.`);
        const row = matches[0];
        const validId = value => /^[1-9]\d*$/.test(String(value ?? ""));
        if (row.incompleteAssessmentId && String(row.incompleteAssessmentId) !== "0" && !validId(row.incompleteAssessmentId)) {
            throw new Error("ACP incomplete assessment ID is invalid; cannot safely select an assessment.");
        }
        const source = validId(row.incompleteAssessmentId) ? "incomplete" : "last";
        const assessmentId = source === "incomplete" ? row.incompleteAssessmentId : row.lastAssessmentId;
        if (!validId(assessmentId)) {
            if (row.incompleteAssessmentId || row.lastAssessmentId) throw new Error("ACP assessment ID is invalid.");
            return { status: "no-assessment", assetName };
        }
        const payload = await getAssessmentAnswers(assessmentId);
        const answers = Array.isArray(payload) ? payload : payload?.answers;
        if (!Array.isArray(answers)) throw new Error(`ACP assessment ${assessmentId} answers are not a valid array.`);
        // Historical templates use uppercase ACP-NPI1. Canonicalize before selecting
        // the newest answer so casing does not preserve an obsolete answer.
        const relevant = answers.filter(answer => normalize(answer?.alternateQuestionId) === "acp-npi1")
            .map(answer => ({ ...answer, alternateQuestionId: "acp-npi1" }));
        const answer = normalizeAnswersByAlternateQuestionId(relevant)[0];
        const values = extractAnswerValues(answer).map(normalize);
        const selected = [...new Set(values)];
        if (selected.length !== 1 || !["yes", "no"].includes(selected[0])) {
            throw new Error(`ACP assessment ${assessmentId} (${source}) ACP-NPI1 is missing, unanswered, or not an unambiguous Yes/No answer.`);
        }
        return { status: "found", assetName, assessmentId, source, serviceAccountAnswer: selected[0] };
    } catch (error) {
        return { status: "error", assetName, error: error.message };
    }
}
