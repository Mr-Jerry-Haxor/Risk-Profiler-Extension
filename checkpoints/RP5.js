import {
    fail,
    getValues,
    normalize,
    pass,
    notApplicable,
    valueContainsAny
}
from "./helpers.js";

const RP5 = {
    id: "RP5",
    name: "MFA applications should identify personal information data",
    category: "Information Types",
    requiredQuestions: [
    "CSIR-MFA",
    "CSIR-Data"
    ],

    async validate(context) {

        const mfaValues =
            getValues(
                context,
                "CSIR-MFA"
            );

        const mfaApplicable =
            mfaValues.some(
                value =>
                    normalize(value) !==
                    normalize("Not Applicable")
            );

        if (!mfaApplicable) {

            return notApplicable(
                this.id,
                "MFA is Not Applicable or not answered."
            );
        }

        const containsPII =
            valueContainsAny(
                context,
                "CSIR-Data",
                [
                    "Personally Identifiable Information",
                    "Personal Information",
                    "IPSM 2.2.9"
                ]
            );

        if (containsPII) {

            return pass(
                this.id,
                "MFA is applicable and CSIR-Data includes Personally Identifiable Information / Personal Information."
            );
        }

        return fail(
            this.id,
            "MFA is applicable, but CSIR-Data does not include Personally Identifiable Information / Personal Information (IPSM 2.2.9)."
        );
    }
};

export default RP5;
