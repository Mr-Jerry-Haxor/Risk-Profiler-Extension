import {
    extractHttpUrls,
    fail,
    findValuesByKeyFragment,
    getAnswer,
    getAnswers,
    getQuestionSummary,
    hasAnswer,
    includesValue,
    normalize,
    notApplicable,
    pass
}
from "./helpers.js";

const RP3 = {
    id: "RP3",
    name: "WSSO applications must have a URL",
    category: "Architecture Overview",
    requiredQuestions: [
        "CSIR-MFA",
        "CSIR-AppType"
    ],

    async validate(context) {

        const wssoSelected =
            includesValue(
                context,
                "CSIR-MFA",
                "MFA via Web Single Sign On (WSSO)"
            );

        if (!wssoSelected) {

            return notApplicable(
                this.id,
                "MFA via Web Single Sign On (WSSO) is not selected."
            );
        }

        let apiUrls = [];

        try {

            const appTypeAnswer =
                getAnswer(
                    context,
                    "CSIR-AppType"
                );

            const surveyTemplateQuestionId =
                appTypeAnswer?.surveyTemplateQuestionId;

            if (surveyTemplateQuestionId) {

                const summary =
                    await getQuestionSummary(
                        context,
                        surveyTemplateQuestionId
                    );

                apiUrls =
                    extractHttpUrls(
                        [
                            summary?.collectedDataItems,
                            summary?.lastAssessmentCollectedDataItems
                        ]
                    );
            }

        } catch (error) {

            console.warn(
                `RP3 URL lookup failed: ${error.message}`
            );
        }

        const apiUrlFound =
            apiUrls.some(
                url =>
                    /^https?:\/\//i.test(
                        String(url || "").trim()
                    )
            );

        const answerUrlFound =
            getAnswers(context)
                .some(answer => {

                    const questionId =
                        normalize(
                            answer.alternateQuestionId
                        );

                    if (
                        !questionId.includes("url")
                    ) {
                        return false;
                    }

                    return hasAnswer(
                        context,
                        answer.alternateQuestionId
                    );
                });

        const detailUrlFound =
            findValuesByKeyFragment(
                [
                    context?.assessment,
                    context?.application
                ],
                [
                    "url",
                    "uri",
                    "link"
                ]
            )
                .some(
                    value =>
                        /^https?:\/\//i.test(
                            String(value || "").trim()
                        )
                );

        const hasUrl =
            apiUrlFound ||
            answerUrlFound ||
            detailUrlFound;

        return hasUrl
            ? pass(
                this.id,
                "WSSO is selected and a URL exists for the application."
            )
            : fail(
                this.id,
                "WSSO is selected but no URL exists for the application."
            );
    }
};

export default RP3;
