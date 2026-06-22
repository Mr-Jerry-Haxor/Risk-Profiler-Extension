import { fetchJson } from "../api/requestManager.js";
import { URLS } from "../utils/constants.js";

export const STATUS = {
    PASS: "PASS",
    FAIL: "FAIL",
    NA: "NA"
};

export function checkpointResult(
    id,
    status,
    reason
) {

    return {
        id,
        status,
        reason
    };
}

export function pass(
    id,
    reason
) {

    return checkpointResult(
        id,
        STATUS.PASS,
        reason
    );
}

export function fail(
    id,
    reason
) {

    return checkpointResult(
        id,
        STATUS.FAIL,
        reason
    );
}

export function notApplicable(
    id,
    reason
) {

    return checkpointResult(
        id,
        STATUS.NA,
        reason
    );
}

export function normalize(
    value
) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase()
        .replace(
            /[\u2010-\u2015]/g,
            "-"
        )
        .replace(
            /\s+/g,
            " "
        );
}

export function getAnswer(
    context,
    questionId
) {

    return getAnswers(
        context
    ).find(
        answer =>
            answer.alternateQuestionId ===
            questionId
    );
}

export function getValues(
    context,
    questionId
) {

    const answer =
        getAnswer(
            context,
            questionId
        );

    return extractAnswerValues(
        answer
    );
}

export function hasAnswer(
    context,
    questionId
) {

    return getValues(
        context,
        questionId
    ).length > 0;
}

export function includesValue(
    context,
    questionId,
    expected
) {

    const expectedNorm =
        normalize(
            expected
        );

    return getValues(
        context,
        questionId
    ).some(
        value =>
            normalize(
                value
            ) === expectedNorm
    );
}

export function includesAnyValue(
    context,
    questionId,
    expectedValues
) {

    const expected =
        expectedValues.map(
            normalize
        );

    return getValues(
        context,
        questionId
    ).some(
        value =>
            expected.includes(
                normalize(
                    value
                )
            )
    );
}

export function valueContainsAny(
    context,
    questionId,
    fragments
) {

    const normalizedFragments =
        fragments.map(
            normalize
        );

    return getValues(
        context,
        questionId
    ).some(value => {

        const normalizedValue =
            normalize(
                value
            );

        return normalizedFragments.some(
            fragment =>
                normalizedValue.includes(
                    fragment
                )
        );
    });
}

export function isYes(
    context,
    questionId
) {

    return includesValue(
        context,
        questionId,
        "Yes"
    );
}

export function isNo(
    context,
    questionId
) {

    return includesValue(
        context,
        questionId,
        "No"
    );
}

export function isSaas(
    context
) {

    return valueContainsAny(
        context,
        "CSIR-AppType",
        [
            "Software-as-a-Service",
            "SaaS"
        ]
    );
}

export function isWebLikeApplication(
    context
) {

    return valueContainsAny(
        context,
        "CSIR-AppType",
        [
            "Web application",
            "Web service",
            "Web services",
            "API",
            "Software-as-a-Service",
            "SaaS",
            "Platform-as-a-Service",
            "PaaS"
        ]
    );
}

export function getAnswers(
    context
) {

    const answers =
        context?.answers;

    if (
        Array.isArray(
            answers
        )
    ) {

        return answers;
    }

    if (
        Array.isArray(
            answers?.answers
        )
    ) {

        return answers.answers;
    }

    return [];
}

export function extractAnswerValues(
    answer
) {

    if (
        !answer
    ) {
        return [];
    }

    const values = [];

    (
        answer.answerOptions || []
    ).forEach(option => {

        if (
            option.internalValue !== undefined
        ) {

            values.push(
                option.internalValue
            );
        }

        if (
            option.additionalData !== undefined &&
            option.additionalData !== null &&
            option.additionalData !== ""
        ) {

            values.push(
                option.additionalData
            );
        }
    });

    return values.filter(
        value =>
            value !== undefined &&
            value !== null &&
            String(
                value
            ).trim() !== ""
    );
}

export function findValuesByKeyFragment(
    node,
    fragments
) {

    const matches = [];

    const normalizedFragments =
        fragments.map(
            normalize
        );

    walkObject(
        node,
        (
            key,
            value
        ) => {

            const normalizedKey =
                normalize(
                    key
                );

            if (
                normalizedFragments.some(
                    fragment =>
                        normalizedKey.includes(
                            fragment
                        )
                )
            ) {

                matches.push(
                    value
                );
            }
        }
    );

    return matches;
}

export function findAssessmentById(
    node,
    assessmentId
) {

    const target =
        normalize(
            assessmentId
        );

    let found = null;

    walkNode(
        node,
        candidate => {

            if (
                found ||
                !candidate ||
                typeof candidate !== "object" ||
                Array.isArray(
                    candidate
                )
            ) {
                return;
            }

            if (
                Object.prototype.hasOwnProperty.call(
                    candidate,
                    "assessmentId"
                ) &&
                normalize(
                    candidate.assessmentId
                ) === target
            ) {

                found =
                    candidate;
            }
        }
    );

    return found;
}

export function collectValuesByKey(
    node,
    keyName
) {

    const values = [];

    walkObject(
        node,
        (
            key,
            value
        ) => {

            if (
                key === keyName
            ) {

                values.push(
                    value
                );
            }
        }
    );

    return values;
}

export function deploymentPhase(
    context
) {

    const applicationPhase =
        context?.application?.lifeCycle;

    if (
        applicationPhase
    ) {

        return applicationPhase;
    }

    const versionPhase =
        (
            context?.versions || []
        ).map(version =>
            version.deploymentPhase ||
            version.lifeCycle ||
            version.lifecycle ||
            version.phase
        )
            .find(Boolean);

    return versionPhase || "";
}

function walkObject(
    node,
    visit
) {

    if (
        !node
    ) {
        return;
    }

    if (
        Array.isArray(
            node
        )
    ) {

        node.forEach(
            item =>
                walkObject(
                    item,
                    visit
                )
        );

        return;
    }

    if (
        typeof node !== "object"
    ) {
        return;
    }

    Object.entries(
        node
    ).forEach(
        ([
            key,
            value
        ]) => {

            visit(
                key,
                value
            );

            walkObject(
                value,
                visit
            );
        }
    );
}

function walkNode(
    node,
    visit
) {

    visit(
        node
    );

    if (
        !node ||
        typeof node !== "object"
    ) {
        return;
    }

    if (
        Array.isArray(
            node
        )
    ) {

        node.forEach(
            item =>
                walkNode(
                    item,
                    visit
                )
        );

        return;
    }

    Object.values(
        node
    ).forEach(
        value =>
            walkNode(
                value,
                visit
            )
    );
}

export async function getQuestionSummary(
    context,
    surveyTemplateQuestionId
) {

    const assessmentId =
        context?.application?.assessmentId ||
        context?.assessment?.assessmentId;

    if (
        !assessmentId ||
        !surveyTemplateQuestionId
    ) {

        throw new Error(
            "Assessment ID or Survey Template Question ID is missing"
        );
    }

    const cairoOrigin =
        new URL(
            URLS.PRIMARY_ASSESSMENTS
        ).origin;

    const url =
        `${cairoOrigin}/api/assessment/survey/${assessmentId}/question/${surveyTemplateQuestionId}`;

    return fetchJson(url);
}

export function questionExists(
    context,
    questionId
) {

    return Boolean(
        context?.questionMap?.has(
            questionId
        )
    );
}

export function getSurveyQuestion(
    context,
    questionId
) {

    return context?.questionMap?.get(
        questionId
    );
}

export function missingQuestionResult(
    checkpointId,
    questionId
) {

    return notApplicable(
        checkpointId,
        `Question identifier was not found in the survey questions. (${questionId})`
    );
}