import {
    CHECKPOINTS
}
from "./checkpointRegistry.js";

import {
    calculateScore
}
from "./scoreCalculator.js";

export async function runValidation(
    context
) {

    const results = [];

    for (
        const checkpoint
        of CHECKPOINTS
    ) {

        try {

            const result =
                await checkpoint
                    .validate(
                        context
                    );

            results.push(
                result
            );

        } catch (error) {

            results.push({

                id:
                    checkpoint.id,

                status:
                    "FAIL",

                reason:
                    error.message
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
