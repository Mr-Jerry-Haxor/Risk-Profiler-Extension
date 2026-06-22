import {
    getAssessmentContext
}
from "../api/cairoApi.js";

import {
    getReviewSummary
}
from "../api/reviewApi.js";

import {
    getAllArtifacts
}
from "../api/esatsApi.js";

import {
    getExportControlData
}
from "../api/gtcApi.js";

export async function buildContext(
    assessment
) {

    const assessmentId =
        assessment.assessmentId;

    const assetId =
        assessment.assetId;

    const [
        cairo,
        review,
        esats
    ] =
    await Promise.all([

        getAssessmentContext(
            assessmentId
        ),

        getReviewSummary(
            assetId
        ),

        getAllArtifacts(
            assetId
        )
    ]);

    const exportControl =
        await getExportControlData(
            esats.artifacts
        );

    return {

        application:
            assessment,

        assessment:
            cairo.detail,

        answers:
            cairo.answers,

        surveyQuestions:
            cairo.surveyQuestions || [],

        questionMap:
            cairo.questionMap ||
            new Map(),

        reviewSummary:
            review,

        versions:
            esats.versions,

        artifacts:
            esats.artifacts,

        exportControl
    };
}