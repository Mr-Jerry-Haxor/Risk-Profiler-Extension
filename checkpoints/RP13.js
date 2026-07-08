import {
    fail,
    hasRiskProfilerApprovals,
    includesValue,
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

        if (
            includesValue(
                context,
                "CSIR-SCR-NonpersonAcct-Managed",
                "No"
            )
        ) {

            return fail(
                this.id,
                "CSIR-SCR-NonpersonAcct-Managed is No."
            );
        }

        if (
            includesValue(
                context,
                "CSIR-SCR-NonpersonAcct-Managed",
                "Yes"
            )
        ) {

            return pass(
                this.id,
                "CSIR-SCR-NonpersonAcct-Managed is Yes."
            );
        }

        if (
            hasRiskProfilerApprovals(
                context
            )
        ) {

            return notApplicable(
                this.id,
                "CSIR-SvcAcct is Yes and RP1 approvals passed, but CSIR-SCR-NonpersonAcct-Managed is not answered."
            );
        }

        return fail(
            this.id,
            "CSIR-SCR-NonpersonAcct-Managed is not answered."
        );
    }
};

export default RP13;
