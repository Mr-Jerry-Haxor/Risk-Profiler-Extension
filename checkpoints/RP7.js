import {
    fail,
    isYes,
    notApplicable,
    pass
}
from "./helpers.js";

const RP7 = {
    id: "RP7",
    name: "Export Controlled = Yes has EAR/ITAR data type selected",
    category: "Information Types",

    async validate(context) {

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
                "Export Controlled is Yes, but EAR-NLR, EAR-LR, and ITAR are not selected as Yes."
            );
    }
};

export default RP7;
