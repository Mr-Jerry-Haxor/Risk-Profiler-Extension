import {
    fail,
    getValues,
    includesValue,
    isYes,
    notApplicable,
    pass
}
from "./helpers.js";

const RP12 = {

    id: "RP12",

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

            return pass(
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

        if (
            getValues(
                context,
                "CSIR-SCR-NonpersonAcct-Disable"
            ).length > 0
        ) {

            return fail(
                this.id,
                "CSIR-SCR-NonpersonAcct-Disable has a selected value other than Yes or No."
            );
        }

        return notApplicable(
            this.id,
            "CSIR-SCR-NonpersonAcct-Disable was not found or is not answered in the survey."
        );
    }
};

export default RP12;
