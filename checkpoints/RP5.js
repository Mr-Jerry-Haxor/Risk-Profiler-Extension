import {
    fail,
    getValues,
    includesValue,
    normalize,
    notApplicable,
    pass,
    valueContainsAny
}
from "./helpers.js";

const RP5 = {
    id: "RP5",
    name: "Applicable MFA has personal information data type selected",
    category: "Information Types",

    async validate(context) {

        const mfaValues =
            getValues(
                context,
                "CSIR-MFA"
            );

        const mfaApplicable =
            mfaValues.some(
                value =>
                    normalize(
                        value
                    ) !==
                    normalize(
                        "Not Applicable"
                    )
            );

        if (
            !mfaApplicable
        ) {

            return notApplicable(
                this.id,
                "MFA is Not Applicable or not answered."
            );
        }

        const hasPersonalInformation =
            valueContainsAny(
                context,
                "CSIR-Data",
                [
                    "Personally Identifiable Information",
                    "Personal Information"
                ]
            ) ||
            includesValue(
                context,
                "CSIR-Data-PII",
                "Yes"
            ) ||
            valueContainsAny(
                context,
                "CSIR-Data-PII-Type",
                [
                    "Non-Sensitive Personal Information",
                    "Sensitive Personal Information"
                ]
            );

        return hasPersonalInformation
            ? pass(
                this.id,
                "MFA is applicable and personal information data type is selected."
            )
            : fail(
                this.id,
                "MFA is applicable, but personal information/NSPII data type is not selected."
            );
    }
};

export default RP5;
