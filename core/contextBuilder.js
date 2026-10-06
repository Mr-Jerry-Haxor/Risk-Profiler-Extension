import {
    getAssessmentContext,
    getBusinessApplicationContactDetailsSummary
}
from "../api/cairoApi.js";

import {
    getAsaName
}
from "./contactUtils.js";

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

import { getAcpServiceAccountEvidence } from "../api/acpApi.js";

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
        esats,
        contacts,
        acp
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
        ),

        getBusinessApplicationContactDetailsSummary(
            assetId
        ).catch(
            () => []
        ),

        getAcpServiceAccountEvidence(assessment.assetName)
    ]);

    const exportControl =
        await getExportControlData(
            esats.artifacts
        );

    return {

        application: {
            ...assessment,
            asaName:
                getAsaName(
                    assessment,
                    contacts
                )
        },

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

        exportControl,

        acp
    };
}
