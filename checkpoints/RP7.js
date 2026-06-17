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

    async validate(context) {

        // Case 2: CSIR-ExportControlled is No — not applicable
        if (
            !isYes(
                context,
                "CSIR-ExportControlled"
            )
        ) {

            return notApplicable(
                this.id,
                "CSIR-ExportControlled is not Yes."
            );
        }

        // Case 1: CSIR-ExportControlled is Yes but jurisdiction is Other — not applicable
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

        // Case 3: Check that at least one of EAR-NLR, EAR-LR, or ITAR is selected Yes
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
