import {
    URLS
}
from "../utils/constants.js";

import {
    replaceTokens
}
from "../utils/helpers.js";

import {
    fetchJson
}
from "./requestManager.js";

export async function getAssessmentList() {

    return fetchJson(
        URLS.PRIMARY_ASSESSMENTS
    );
}

export async function getAssessmentDetail(
    assessmentId
) {

    const url =
        replaceTokens(
            URLS.ASSESSMENT_DETAIL,
            {
                id: assessmentId
            }
        );

    return fetchJson(url);
}

export async function getAssessmentAnswers(
    assessmentId
) {

    const url =
        replaceTokens(
            URLS.ASSESSMENT_ANSWERS,
            {
                id: assessmentId
            }
        );

    return fetchJson(url);
}

export async function getAssessmentContacts(
    assessmentId
) {

    const url =
        replaceTokens(
            URLS.ASSESSMENT_CONTACTS,
            {
                id: assessmentId
            }
        );

    return fetchJson(url);
}

export async function getBusinessApplicationContactDetailsSummary(
    assetId
) {

    const url =
        replaceTokens(
            URLS.ESATS_CONTACT_DETAILS_SUMMARY,
            {
                assetId
            }
        );

    return fetchJson(url);
}

export async function getSurveyQuestions(
    surveyTemplateId
) {

    if (
        !surveyTemplateId
    ) {

        return [];
    }

    const url =
        replaceTokens(
            URLS.SURVEY_TEMPLATE_QUESTIONS,
            {
                id: surveyTemplateId
            }
        );

    return fetchJson(url);
}

export async function getSurveyTemplateDetails(
    surveyTemplateId
) {

    if (
        !surveyTemplateId
    ) {

        return null;
    }

    const url =
        replaceTokens(
            URLS.SURVEY_TEMPLATE_DETAIL,
            {
                id: surveyTemplateId
            }
        );

    return fetchJson(url);
}

export async function getRiskProfilerSurveyTemplates() {

    return fetchJson(
        URLS.SURVEY_TEMPLATES_RP_APP,
        {
            useCache:
                false
        }
    );
}

export async function getAssessmentContext(
    assessmentId
) {

    const detail =
        await getAssessmentDetail(
            assessmentId
        );

    const surveyTemplateId =
        detail?.surveyTemplateId;

    const [
        answers,
        surveyQuestions
    ] =
    await Promise.all([

        getAssessmentAnswers(
            assessmentId
        ),

        getSurveyQuestions(
            surveyTemplateId
        )
    ]);

    const questionMap =
        new Map(

            (surveyQuestions || [])

                .filter(
                    question =>
                        question?.alternateQuestionId
                )

                .map(
                    question => [

                        question.alternateQuestionId,

                        question
                    ]
                )
        );

    return {

        detail,

        answers,

        surveyQuestions:
            surveyQuestions || [],

        questionMap
    };
}
