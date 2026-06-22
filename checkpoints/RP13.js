import {
    fail,
    includesAnyValue,
    isYes,
    notApplicable,
    pass
}
from "./helpers.js";

const RP13 = {
    id: "RP13",
    name: "Nonperson accounts are managed",
    category: "SCR",
    requiredQuestions: [
    "CSIR-SvcAcct",
    "CSIR-SCR-NonpersonAcct-Managed"
    ],

    async validate(context) {

        if (
            !isYes(
                context,
                "CSIR-SvcAcct"
            )
        ) {

            return notApplicable(
                this.id,
                "CSIR-SvcAcct is not Yes."
            );
        }

        return includesAnyValue(
            context,
            "CSIR-SCR-NonpersonAcct-Managed",
            [
                "Yes",
                "No"
            ]
        )
            ? pass(
                this.id,
                "CSIR-SCR-NonpersonAcct-Managed is answered Yes or No."
            )
            : fail(
                this.id,
                "CSIR-SvcAcct is Yes, so CSIR-SCR-NonpersonAcct-Managed must be Yes or No."
            );
    }
};

export default RP13;
