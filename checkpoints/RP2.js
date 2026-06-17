import {
    fail,
    findValuesByKeyFragment,
    getAnswers,
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

        return answerUrlFound || detailUrlFound
            ? pass(
                this.id,
                "Web-based application type selected and at least one URL was found."
            )
            : fail(
                this.id,
                "Web-based application type selected, but no URL was found in assessment answers or details."
            );
    }
};

export default RP2;
