import {
    buildContext
}
from "./contextBuilder.js";

import {
    runValidation
}
from "./validationEngine.js";

const MAX_CONCURRENT =
    5;

export async function validateBatch(
    assessments,
    progressCallback,
    shouldCancel
) {

    const results = [];

    let completed = 0;

    for (
        let i = 0;
        i < assessments.length;
        i += MAX_CONCURRENT
    ) {

        if (
            shouldCancel &&
            shouldCancel()
        ) {

            throw new Error(
                "Validation cancelled by user"
            );
        }

        const batch =
            assessments.slice(
                i,
                i +
                MAX_CONCURRENT
            );

        const batchResults =
            await Promise.all(

                batch.map(
                    async assessment => {

                        try {

                            const context =
                                await buildContext(
                                    assessment
                                );

                            const result =
                                await runValidation(
                                    context
                                );

                            completed++;

                            if (
                                progressCallback
                            ) {

                                progressCallback({

                                    completed,

                                    total:
                                        assessments.length,

                                    current:
                                        assessment.assetName,

                                    assessment,

                                    result,

                                    context
                                });
                            }

                            return result;

                        } catch (error) {

                            completed++;

                            const result = {

                                assessmentId:
                                    assessment.assessmentId,

                                assetName:
                                    assessment.assetName,

                                assessment,

                                error:
                                    error.message
                            };

                            if (
                                progressCallback
                            ) {

                                progressCallback({

                                    completed,

                                    total:
                                        assessments.length,

                                    current:
                                        assessment.assetName,

                                    assessment,

                                    result
                                });
                            }

                            return result;
                        }
                    }
                )
            );

        results.push(
            ...batchResults
        );
    }

    return results;
}
