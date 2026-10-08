import {
    fail,
    getValues,
    includesValue,
    isYes,
    notApplicable,
    pass
}
from "./helpers.js";

const RP14 = {
    id: "RP14",
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
            getValues(
                context,
                "CSIR-SCR-NonpersonAcct-Managed"
            ).length > 0
        ) {

            return fail(
                this.id,
                "CSIR-SCR-NonpersonAcct-Managed has a selected value other than Yes or No."
            );
        }

        return notApplicable(
            this.id,
            "CSIR-SCR-NonpersonAcct-Managed was not found or is not answered in the survey."
        );
    }
};

export default RP14;
