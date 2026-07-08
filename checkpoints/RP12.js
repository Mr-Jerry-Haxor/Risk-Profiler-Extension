import {
    fail,
    hasRiskProfilerApprovals,
    includesValue,
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

        if (
            includesValue(
                context,
                "CSIR-SCR-NonpersonAcct-Restricted",
                "No"
            )
        ) {

            return fail(
                this.id,
                "CSIR-SCR-NonpersonAcct-Restricted is No."
            );
        }

        if (
            includesValue(
                context,
                "CSIR-SCR-NonpersonAcct-Restricted",
                "Yes"
            )
        ) {

            return pass(
                this.id,
                "CSIR-SCR-NonpersonAcct-Restricted is Yes."
            );
        }

        if (
            hasRiskProfilerApprovals(
                context
            )
        ) {

            return notApplicable(
                this.id,
                "CSIR-SvcAcct is Yes and RP1 approvals passed, but CSIR-SCR-NonpersonAcct-Restricted is not answered."
            );
        }

        return fail(
            this.id,
            "CSIR-SCR-NonpersonAcct-Restricted is not answered."
        );
    }
};

export default RP12;
