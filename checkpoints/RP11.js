import {
    fail,
    includesAnyValue,
    isYes,
    notApplicable,
    pass
}
from "./helpers.js";

const RP11 = {
    id: "RP11",
    name: "Nonperson accounts are removed/disabled when not required",
    category: "SCR",

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
            "CSIR-SCR-NonpersonAcct-Disable",
            [
                "Yes",
                "No"
            ]
        )
            ? pass(
                this.id,
                "CSIR-SCR-NonpersonAcct-Disable is answered Yes or No."
            )
            : fail(
                this.id,
                "CSIR-SvcAcct is Yes, so CSIR-SCR-NonpersonAcct-Disable must be Yes or No."
            );
    }
};

export default RP11;
