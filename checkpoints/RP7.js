import {
    fail,
    hasAnswer,
    includesValue,
    isYes,
    notApplicable,
    pass,
    valueContainsAny
}
from "./helpers.js";

const RP7 = {
    id: "RP7",
    name: "Export Controlled = Yes has EAR/ITAR data type selected",
    category: "Information Types",
    requiredQuestions: [
    "CSIR-ExportControlled",
    "CSIR-ExportControlled-Jurisdiction",
    "CSIR-USEC-EAR-NLR",
    "CSIR-USEC-EAR-LR",
    "CSIR-USEC-ITAR"
    ],

    async validate(context) {

    const exportControlled =
        isYes(
            context,
            "CSIR-ExportControlled"
        );

    const hasRequiredType =
        [
            "CSIR-USEC-EAR-NLR",
            "CSIR-USEC-EAR-LR",
            "CSIR-USEC-ITAR"
        ].some(
            questionId =>
                isYes(
                    context,
                    questionId
                )
        );

    if (
        !exportControlled &&
        hasRequiredType
    ) {

        return fail(
            this.id,
            "EAR/ITAR data types are selected, but CSIR-ExportControlled is No."
        );
    }

    if (
        !exportControlled
    ) {

        return notApplicable(
            this.id,
            "CSIR-ExportControlled is not Yes."
        );
    }

    const jurisdictionIsOther =
        valueContainsAny(
            context,
            "CSIR-ExportControlled-Jurisdiction",
            [
                "other"
            ]
        );

    if (
        jurisdictionIsOther
    ) {

        return notApplicable(
            this.id,
            "CSIR-ExportControlled is Yes but jurisdiction is Other — EAR/ITAR check does not apply."
        );
    }

    return hasRequiredType
        ? pass(
            this.id,
            "Export Controlled is Yes and at least one EAR-NLR, EAR-LR, or ITAR type is Yes."
        )
        : fail(
            this.id,
            "Export Controlled is Yes, but none of EAR-NLR, EAR-LR, or ITAR are selected as Yes."
        );
}
};

export default RP7;
