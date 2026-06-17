import {
    fail,
    findValuesByKeyFragment,
    getAnswer,
    getAnswers,
    getQuestionSummary,
    hasAnswer,
    isWebLikeApplication,
    normalize,
    notApplicable,
    pass
}
from "./helpers.js";

const RP2 = {
    id: "RP2",
    name: "Web application, web service, or SaaS has at least one URL",
    category: "Architecture Overview",

    async validate(context) {

        if (
            !isWebLikeApplication(
                context
            )
        ) {

            return notApplicable(
                this.id,
                "Application type is not Web application, Web service/API, or SaaS."
            );
        }

        // Try to fetch collector values from CSIR-AppType surveyTemplateQuestionId
        let apiUrls = [];
        let fetchErrorMsg = "";
        try {
            const appTypeAnswer =
                getAnswer(
                    context,
                    "CSIR-AppType"
                );

            const surveyTemplateQuestionId =
                appTypeAnswer?.surveyTemplateQuestionId;

            if (
                surveyTemplateQuestionId
            ) {

                const summary =
                    await getQuestionSummary(
                        context,
                        surveyTemplateQuestionId
                    );

                apiUrls =
                    (summary?.collectedDataItems || [])
                        .map(
                            item =>
                                item?.dataCollector?.collectorValue
                        )
                        .filter(Boolean);
            }
        } catch (error) {
            fetchErrorMsg = error.message;
            console.warn(
                `Failed to fetch question summary in RP2: ${error.message}`
            );
        }

        const apiUrlFound =
            apiUrls.some(
                url =>
                    /^https?:\/\//i.test(
                        String(
                            url || ""
                        ).trim()
                    )
            );

        const answerUrlFound =
            getAnswers(
                context
            ).some(answer => {

                const questionId =
                    normalize(
                        answer.alternateQuestionId
                    );

                if (
                    !questionId.includes(
                        "url"
                    )
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
            ).some(
                value =>
                    /^https?:\/\//i.test(
                        String(
                            value || ""
                        ).trim()
                    )
            );

        return apiUrlFound || answerUrlFound || detailUrlFound
            ? pass(
                this.id,
                `Web-based application type selected and at least one URL was found.${
                    apiUrlFound ? ` (Found URLs: ${apiUrls.map(u => String(u).trim()).join(", ")})` : ""
                }`
            )
            : fail(
                this.id,
                `Web-based application type selected, but no URL was found in assessment answers, details, or survey collector values.${
                    fetchErrorMsg ? ` (Survey API fetch error: ${fetchErrorMsg})` : ""
                }`
            );
    }
};

export default RP2;
