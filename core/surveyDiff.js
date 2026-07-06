import {
    getSurveyQuestions,
    getSurveyTemplateDetails
} from "../api/cairoApi.js";

function getSurveyMap(questions) {
    const map = new Map();

    for (const q of questions) {
        if (q.alternateQuestionId) {
            map.set(q.alternateQuestionId, q);
        }
    }

    return map;
}

export async function surveyDifference(
    fromSurveyTemplateId,
    toSurveyTemplateId
) {

    if (
        !fromSurveyTemplateId ||
        !toSurveyTemplateId
    ) {

        throw new Error(
            "Both survey template IDs are required."
        );
    }

    if (
        Number(fromSurveyTemplateId) ===
        Number(toSurveyTemplateId)
    ) {

        return {
            metadata: {
                fromId:
                    Number(fromSurveyTemplateId),
                toId:
                    Number(toSurveyTemplateId)
            },
            newQuestions: [],
            removedQuestions: [],
            modifiedQuestions: []
        };
    }

    const [
        fromTemplate,
        fromQuestions,
        toTemplate,
        toQuestions
    ] = await Promise.all([

        getSurveyTemplateDetails(
            fromSurveyTemplateId
        ),

        getSurveyQuestions(
            fromSurveyTemplateId
        ),

        getSurveyTemplateDetails(
            toSurveyTemplateId
        ),

        getSurveyQuestions(
            toSurveyTemplateId
        )
    ]);

    if (
        !fromTemplate ||
        !toTemplate
    ) {

        throw new Error(
            "Unable to load one or both survey template details."
        );
    }

    const mapOld =
        getSurveyMap(
            fromQuestions || []
        );

    const mapNew =
        getSurveyMap(
            toQuestions || []
        );

    const allKeys =
        new Set([
            ...mapOld.keys(),
            ...mapNew.keys()
        ]);

    const keysArray =
        Array.from(
            allKeys
        ).sort();

    const diff = {
        metadata: {
            fromId:
                Number(fromSurveyTemplateId),
            fromVersionNumber:
                fromTemplate.versionNumber,
            fromUpdatedOn:
                fromTemplate.updatedOn,
            fromReleasedOn:
                fromTemplate.releasedOn,
            toId:
                Number(toSurveyTemplateId),
            toVersionNumber:
                toTemplate.versionNumber,
            toUpdatedOn:
                toTemplate.updatedOn,
            toReleasedOn:
                toTemplate.releasedOn
        },
        newQuestions: [],
        removedQuestions: [],
        modifiedQuestions: []
    };

    for (const key of keysArray) {
        if (!mapOld.has(key)) {
            diff.newQuestions.push({
                alternateQuestionId:
                    key,
                questionText:
                    mapNew.get(key).questionText
            });
        } else if (!mapNew.has(key)) {
            diff.removedQuestions.push({
                alternateQuestionId:
                    key,
                questionText:
                    mapOld.get(key).questionText
            });
        } else {
            const qOld =
                mapOld.get(key);

            const qNew =
                mapNew.get(key);

            let isModified =
                false;

            const modification = {
                alternateQuestionId:
                    key
            };

            if (
                qOld.questionText !==
                qNew.questionText
            ) {
                modification.textChanged = {
                    old:
                        qOld.questionText,
                    new:
                        qNew.questionText
                };
                isModified = true;
            }

            const optsOld =
                new Set(
                    (qOld.options || [])
                        .map(o => o.displayValue)
                );

            const optsNew =
                new Set(
                    (qNew.options || [])
                        .map(o => o.displayValue)
                );

            const addedOpts =
                [...optsNew].filter(
                    o => !optsOld.has(o)
                );

            const removedOpts =
                [...optsOld].filter(
                    o => !optsNew.has(o)
                );

            if (
                addedOpts.length > 0 ||
                removedOpts.length > 0
            ) {
                modification.optionsChanged = {
                    added:
                        addedOpts,
                    removed:
                        removedOpts
                };
                isModified = true;
            }

            if (isModified) {
                diff.modifiedQuestions.push(
                    modification
                );
            }
        }
    }

    return diff;
}
