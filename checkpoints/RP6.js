import {
    fail,
    includesValue,
    notApplicable,
    pass,
    valueContainsAny
}
from "./helpers.js";

const RP6 = {
    id: "RP6",
    name: "US-person PII data has the required answer",
    category: "Information Types",
    requiredQuestions: [
    "CSIR-Data",
    "CSIR-PersonStatus",
    "CSIR-Data-PII-USPerson"
    ],

    async validate(context) {

        const containsPII =
            valueContainsAny(
                context,
                "CSIR-Data",
                [
                    "Personally Identifiable Information / Personal Information (IPSM 2.2.9)",
                    "Personally Identifiable Information",
                    "Personal Information",
                    "IPSM 2.2.9"
                ]
            );

        const includesUSPersons =
            includesValue(
                context,
                "CSIR-PersonStatus",
                "U.S. Persons"
            ) ||
            includesValue(
                context,
                "CSIR-PersonStatus",
                "US Persons"
            );

        if (
            !containsPII ||
            !includesUSPersons
        ) {

            return notApplicable(
                this.id,
                "CSIR-Data does not include PII or CSIR-PersonStatus does not include U.S. Persons."
            );
        }

        return includesValue(
            context,
            "CSIR-Data-PII-USPerson",
            "Yes"
        )
            ? pass(
                this.id,
                "PII is associated with U.S. Persons and CSIR-Data-PII-USPerson is Yes."
            )
            : fail(
                this.id,
                "PII is associated with U.S. Persons, so CSIR-Data-PII-USPerson must be Yes."
            );
    }
};

export default RP6;
