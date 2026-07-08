import {
    fail,
    getValues,
    hasRiskProfilerApprovals,
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

        if (
            hasRiskProfilerApprovals(
                context
            )
        ) {

            return notApplicable(
                this.id,
                "CSIR-SvcAcct is Yes and RP1 approvals passed, but CSIR-SCR-NonpersonAcct-Disable is not answered."
            );
        }

        return fail(
            this.id,
            "CSIR-SCR-NonpersonAcct-Disable is not answered."
        );
    }
};

export default RP11;
