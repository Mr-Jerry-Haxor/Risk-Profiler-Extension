import {
    fail,
    getValues,
    includesValue,
    isYes,
    notApplicable,
    pass
}
from "./helpers.js";

const RP13 = {
    id: "RP13",
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
            getValues(
                context,
                "CSIR-SCR-NonpersonAcct-Restricted"
            ).length > 0
        ) {

            return fail(
                this.id,
                "CSIR-SCR-NonpersonAcct-Restricted has a selected value other than Yes or No."
            );
        }

        return notApplicable(
            this.id,
            "CSIR-SCR-NonpersonAcct-Restricted was not found or is not answered in the survey."
        );
    }
};

export default RP13;
