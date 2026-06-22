import {
    fail,
    getValues,
    normalize,
    notApplicable,
    pass
}
from "./helpers.js";

const PERSON_CLASS_MAP = [
    [
        "Boeing employees",
        "Boeing Employees"
    ],
    [
        "Boeing Customers",
        "Boeing Customers"
    ],
    [
        "Boeing Suppliers",
        "Boeing Suppliers"
    ],
    [
        "Boeing subsidiaries",
        "Boeing Subsidiary"
    ],
    [
        "Non-Boeing (Contract Labor)",
        "Non-Boeing (Contract Labor)"
    ],
    [
        "Non-Boeing (Consultants/Professional Services)",
        "Non-Boeing (Consultants/Professional Services)"
    ],
    [
        "Non-Boeing (Industry Assist)",
        "Non-Boeing (Industry Assist)"
    ],
    [
        "Non-Boeing (Purchased Services/Contingent Labor)",
        "Non-Boeing (Purchased Services/Contingent Labor)"
    ]
];

const RP9 = {
    id: "RP9",
    name: "Developer person classifications are represented in person class",
    category: "Users",
    requiredQuestions: [
    "CSIR-DevPersonClassification",
    "CSIR-PersonClass"
    ],

    async validate(context) {

        const developerTypes =
            getValues(
                context,
                "CSIR-DevPersonClassification"
            ).filter(
                value =>
                    normalize(
                        value
                    ) !== "none"
            );

        if (
            developerTypes.length === 0
        ) {

            return notApplicable(
                this.id,
                "CSIR-DevPersonClassification is None or not answered."
            );
        }

        const personClasses =
            getValues(
                context,
                "CSIR-PersonClass"
            ).map(
                normalize
            );

        const missing =
            developerTypes
                .map(value => {

                    const mapping =
                        PERSON_CLASS_MAP.find(
                            ([source]) =>
                                normalize(
                                    source
                                ) ===
                                normalize(
                                    value
                                )
                        );

                    return mapping
                        ? {
                            source:
                                value,
                            required:
                                mapping[1]
                        }
                        : null;
                })
                .filter(Boolean)
                .filter(
                    mapping =>
                        !personClasses.includes(
                            normalize(
                                mapping.required
                            )
                        )
                );

        if (
            missing.length
        ) {

            return fail(
                this.id,
                `Missing CSIR-PersonClass selection(s): ${missing.map(item => item.required).join(", ")}.`
            );
        }

        return pass(
            this.id,
            "All developer person classifications with corresponding person classes are represented."
        );
    }
};

export default RP9;
