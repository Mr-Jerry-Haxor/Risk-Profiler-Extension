import {
    collectValuesByKey,
    fail,
    findAssessmentById,
    pass
}
from "./helpers.js";

const RP1 = {

    id: "RP1",

    name: "Does the Risk Profiler have both approvals?",

    category: "Architecture Overview",

    async validate(context) {

        const assessmentId =
            context?.application?.assessmentId ||
            context?.assessment?.assessmentId;

        if (
            !assessmentId
        ) {

            return fail(
                this.id,
                "Assessment ID was not available for approval lookup."
            );
        }

        const matchedAssessment =
            findAssessmentById(
                context?.reviewSummary,
                assessmentId
            );

        if (
            !matchedAssessment
        ) {

            return fail(
                this.id,
                `No matching assessmentId ${assessmentId} found in review summaries.`
            );
        }

        const votes =
            collectValuesByKey(
                matchedAssessment,
                "voteCode"
            ).filter(Boolean);

        if (
            votes.length < 2
        ) {

            return fail(
                this.id,
                `Expected at least 2 voteCode values, found ${votes.length}.`
            );
        }

        const firstTwoVotes =
            votes.slice(
                0,
                2
            );

        const approved =
            firstTwoVotes.every(
                vote =>
                    String(
                        vote
                    ).trim() === "A"
            );

        return approved
            ? pass(
                this.id,
                `Matched assessmentId ${assessmentId}; both approval voteCode values are A.`
            )
            : fail(
                this.id,
                `Matched assessmentId ${assessmentId}, but approval voteCode values are: ${firstTwoVotes.join(", ")}.`
            );
    }
};

export default RP1;
