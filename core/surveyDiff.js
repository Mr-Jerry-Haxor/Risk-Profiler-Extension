import { getAssessmentDetail, getSurveyQuestions, getSurveyTemplateDetails } from "../api/cairoApi.js";
import { HARDCODED_SURVEY_TEMPLATE_ID, CONFIG } from "../utils/constants.js";

function getSurveyMap(questions) {
    const map = new Map();
    for (const q of questions) {
        if (q.alternateQuestionId) {
            map.set(q.alternateQuestionId, q);
        }
    }
    return map;
}

export async function checkSurveyChanges(assessments) {
    try {
        const incompleteAssessments = assessments.filter(a => a.incompleteAssessmentId);
        
        if (incompleteAssessments.length === 0) {
            await chrome.storage.local.remove(CONFIG.STORAGE_KEYS.SURVEY_CHANGES);
            return;
        }

        incompleteAssessments.sort((a, b) => {
            const dateA = new Date(a.incompleteInitiatedOn || 0).getTime();
            const dateB = new Date(b.incompleteInitiatedOn || 0).getTime();
            return dateB - dateA;
        });

        const latestAssessment = incompleteAssessments[0];
        
        const detail = await getAssessmentDetail(latestAssessment.incompleteAssessmentId);
        
        if (!detail || !detail.surveyTemplateId) {
            await chrome.storage.local.remove(CONFIG.STORAGE_KEYS.SURVEY_CHANGES);
            return;
        }

        const latestTemplateId = detail.surveyTemplateId;

        if (latestTemplateId === HARDCODED_SURVEY_TEMPLATE_ID) {
            // Hide if no difference
            await chrome.storage.local.remove(CONFIG.STORAGE_KEYS.SURVEY_CHANGES);
            return;
        }

        const [
            hardcodedTemplate,
            hardcodedQuestions,
            latestTemplate,
            latestQuestions
        ] = await Promise.all([
            getSurveyTemplateDetails(HARDCODED_SURVEY_TEMPLATE_ID),
            getSurveyQuestions(HARDCODED_SURVEY_TEMPLATE_ID),
            getSurveyTemplateDetails(latestTemplateId),
            getSurveyQuestions(latestTemplateId)
        ]);

        if (!hardcodedTemplate || !latestTemplate) {
            await chrome.storage.local.remove(CONFIG.STORAGE_KEYS.SURVEY_CHANGES);
            return;
        }

        const mapOld = getSurveyMap(hardcodedQuestions || []);
        const mapNew = getSurveyMap(latestQuestions || []);

        const allKeys = new Set([...mapOld.keys(), ...mapNew.keys()]);
        const keysArray = Array.from(allKeys).sort();

        const diff = {
            metadata: {
                hardcodedId: HARDCODED_SURVEY_TEMPLATE_ID,
                hardcodedUpdatedOn: hardcodedTemplate.updatedOn,
                latestId: latestTemplateId,
                latestUpdatedOn: latestTemplate.updatedOn
            },
            newQuestions: [],
            removedQuestions: [],
            modifiedQuestions: []
        };

        for (const key of keysArray) {
            if (!mapOld.has(key)) {
                diff.newQuestions.push({
                    alternateQuestionId: key,
                    questionText: mapNew.get(key).questionText
                });
            } else if (!mapNew.has(key)) {
                diff.removedQuestions.push({
                    alternateQuestionId: key,
                    questionText: mapOld.get(key).questionText
                });
            } else {
                const qOld = mapOld.get(key);
                const qNew = mapNew.get(key);
                
                let isModified = false;
                const modification = { alternateQuestionId: key };

                if (qOld.questionText !== qNew.questionText) {
                    modification.textChanged = {
                        old: qOld.questionText,
                        new: qNew.questionText
                    };
                    isModified = true;
                }

                const optsOld = new Set((qOld.options || []).map(o => o.displayValue));
                const optsNew = new Set((qNew.options || []).map(o => o.displayValue));

                const addedOpts = [...optsNew].filter(o => !optsOld.has(o));
                const removedOpts = [...optsOld].filter(o => !optsNew.has(o));

                if (addedOpts.length > 0 || removedOpts.length > 0) {
                    modification.optionsChanged = {
                        added: addedOpts,
                        removed: removedOpts
                    };
                    isModified = true;
                }

                if (isModified) {
                    diff.modifiedQuestions.push(modification);
                }
            }
        }

        if (diff.newQuestions.length === 0 && diff.removedQuestions.length === 0 && diff.modifiedQuestions.length === 0) {
            await chrome.storage.local.remove(CONFIG.STORAGE_KEYS.SURVEY_CHANGES);
            return;
        }

        await chrome.storage.local.set({
            [CONFIG.STORAGE_KEYS.SURVEY_CHANGES]: diff
        });

    } catch (error) {
        console.error("Error diffing survey templates:", error);
    }
}
