import {
    fail,
    includesAnyValue,
    isYes,
    notApplicable,
    pass
}
from "./helpers.js";

const RP12 = {
    id: "RP12",
    name: "Nonperson accounts are restricted to authorized purpose",
    category: "SCR",
    requiredQuestions: [
    "CSIR-SvcAcct",
    "CSIR-SCR-NonpersonAcct-Restricted"
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
            "CSIR-SCR-NonpersonAcct-Restricted",
            [
                "Yes",
                "No"
            ]
        )
            ? pass(
                this.id,
                "CSIR-SCR-NonpersonAcct-Restricted is answered Yes or No."
            )
            : fail(
                this.id,
                "CSIR-SvcAcct is Yes, so CSIR-SCR-NonpersonAcct-Restricted must be Yes or No."
            );
    }
};

export default RP12;
