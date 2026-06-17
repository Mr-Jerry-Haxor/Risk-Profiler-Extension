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

export async function getAssessmentContext(
    assessmentId
) {

    const [
        detail,
        answers
    ] =
    await Promise.all([
        getAssessmentDetail(
            assessmentId
        ),
        getAssessmentAnswers(
            assessmentId
        )
    ]);

    return {
        detail,
        answers
    };
}