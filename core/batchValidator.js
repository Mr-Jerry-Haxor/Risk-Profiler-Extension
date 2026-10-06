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

export async function validateBatch(assessments, progressCallback, shouldCancel) {
    const results = [];
    let completed = 0;
    for (let i = 0; i < assessments.length; i += MAX_CONCURRENT) {
        if (shouldCancel?.()) throw new Error("Validation cancelled by user");
        const batch = assessments.slice(i, i + MAX_CONCURRENT);
        const batchResults = await Promise.all(batch.map(async assessment => {
            let result;
            let context;
            try {
                context = await buildContext(assessment);
                result = await runValidation(context);
            } catch (error) {
                context = undefined;
                result = {
                    assessmentId: assessment.assessmentId,
                    assetName: assessment.assetName,
                    assessment,
                    error: error.message
                };
            }
            result.completedAt = Date.now();
            result.completedAt = Date.now();
            completed++;
            // Persist progress before the caller stores its final completion state.
            // Storage/progress errors must not be relabelled as checkpoint failures.
            await progressCallback?.({
                completed, total: assessments.length,
                current: assessment.assetName, assessment, result,
                ...(context ? { context } : {})
            });
            return result;
        }));
        results.push(...batchResults);
    }
    return results;
}
