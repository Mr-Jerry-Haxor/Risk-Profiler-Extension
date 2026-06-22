import {
    fail,
    includesValue,
    isYes,
    notApplicable,
    pass
}
from "./helpers.js";

const RP11 = {

    id: "RP11",

    name: "Nonperson accounts are removed/disabled when not required",

    category: "SCR",

    requiredQuestions: [
        "CSIR-SvcAcct",
        "CSIR-SCR-NonpersonAcct-Disable"
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

        if (
            includesValue(
                context,
                "CSIR-SCR-NonpersonAcct-Disable",
                "No"
            )
        ) {

            return fail(
                this.id,
                "CSIR-SCR-NonpersonAcct-Disable is No."
            );
        }

        if (
            includesValue(
                context,
                "CSIR-SCR-NonpersonAcct-Disable",
                "Yes"
            )
        ) {

            return pass(
                this.id,
                "CSIR-SCR-NonpersonAcct-Disable is Yes."
            );
        }

        return fail(
            this.id,
            "CSIR-SCR-NonpersonAcct-Disable is not answered."
        );
    }
};

export default RP11;
