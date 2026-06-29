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

export async function getSurveyQuestions(
    surveyTemplateId
) {

    if (
        !surveyTemplateId
    ) {

        return [];
    }

    const url =
        `https://cairois.web.boeing.com/api/survey/template/${surveyTemplateId}/questions`;

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