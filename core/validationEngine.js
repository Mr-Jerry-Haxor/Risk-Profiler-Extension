import {
    CHECKPOINTS
}
from "./checkpointRegistry.js";

import {
    calculateScore
}
from "./scoreCalculator.js";

import {
    questionExists
}
from "../checkpoints/helpers.js";

export async function runValidation(
    context
) {

    const results = [];

    for (
        const checkpoint
        of CHECKPOINTS
    ) {

        try {

            const requiredQuestions =
                checkpoint.requiredQuestions ||
                [];

            const missingQuestion =
                requiredQuestions.find(
                    questionId =>
                        !questionExists(
                            context,
                            questionId
                        )
                );

            if (
                missingQuestion
            ) {

                results.push({

                    id:
                        checkpoint.id,

                    status:
                        "NA",

                    reason:
                        "Question identifier was not found in the survey questions."
                });

                continue;
            }

            const result =
                await checkpoint.validate(
                    context
                );

            results.push(
                result
            );

        } catch (error) {

            console.error(
                `${checkpoint.id} failed`,
                error
            );

            results.push({

                id:
                    checkpoint.id,

                status:
                    "FAIL",

                reason:
                    error?.message ||
                    "Unknown validation error"
            });
        }
    }

    const summary =
        calculateScore(
            results
        );

    return {

        assessmentId:
            context.application
                .assessmentId,

        assetName:
            context.application
                .assetName,

        assessment:
            context.application,

        results,

        summary
    };
}
