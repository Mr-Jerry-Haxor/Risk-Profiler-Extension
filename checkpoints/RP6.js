import {
    fail,
    getValues,
    isSaas,
    normalize,
    notApplicable,
    pass
}
from "./helpers.js";

const RP6 = {
    id: "RP6",
    name: "Code classification matches SaaS/GTC export-control reference",
    category: "Information Types",

    async validate(context) {

        const selectedClassifications =
            getValues(
                context,
                "CSIR-CodeClassification"
            );

        if (
            selectedClassifications.length === 0
        ) {

            return fail(
                this.id,
                "CSIR-CodeClassification is not answered."
            );
        }

        const selectedCodes =
            selectedClassifications.map(
                classificationCode
            );

        if (
            isSaas(
                context
            )
        ) {

            return selectedCodes.includes(
                "NOT_SUBJECT"
            )
                ? pass(
                    this.id,
                    "Application is SaaS and classification is Not Subject to Export Controls."
                )
                : fail(
                    this.id,
                    `Application is SaaS, but selected classification is: ${selectedClassifications.join(", ")}.`
                );
        }

        const referenceCodes =
            extractReferenceClassifications(
                [
                    context?.exportControl,
                    context?.artifacts
                ]
            );

        if (
            referenceCodes.length === 0
        ) {

            return notApplicable(
                this.id,
                "No GTC/JCD export-control reference classification was available for comparison."
            );
        }

        const matches =
            selectedCodes.some(
                selected =>
                    referenceCodes.includes(
                        selected
                    )
            );

        return matches
            ? pass(
                this.id,
                `Selected classification matches GTC/JCD reference: ${selectedClassifications.join(", ")}.`
            )
            : fail(
                this.id,
                `Selected classification (${selectedClassifications.join(", ")}) does not match GTC/JCD reference (${referenceCodes.join(", ")}).`
            );
    }
};

function classificationCode(
    value
) {

    const normalized =
        normalize(
            value
        );

    if (
        normalized.includes(
            "not subject"
        )
    ) {
        return "NOT_SUBJECT";
    }

    if (
        normalized.includes(
            "ear-nlr"
        ) ||
        normalized.includes(
            "ear controlled, no license"
        )
    ) {
        return "EAR_NLR";
    }

    if (
        normalized.includes(
            "ear-lr"
        ) ||
        normalized.includes(
            "ear controlled, license"
        )
    ) {
        return "EAR_LR";
    }

    if (
        normalized.includes(
            "itar"
        )
    ) {
        return "ITAR";
    }

    return normalized.toUpperCase();
}

function extractReferenceClassifications(
    node
) {

    const textValues = [];

    collectText(
        node,
        textValues
    );

    return [
        ...new Set(
            textValues
                .map(
                    classificationCode
                )
                .filter(code =>
                    [
                        "NOT_SUBJECT",
                        "EAR_NLR",
                        "EAR_LR",
                        "ITAR"
                    ].includes(
                        code
                    )
                )
        )
    ];
}

function collectText(
    node,
    values
) {

    if (
        node === null ||
        node === undefined
    ) {
        return;
    }

    if (
        typeof node === "string" ||
        typeof node === "number"
    ) {

        values.push(
            String(
                node
            )
        );

        return;
    }

    if (
        Array.isArray(
            node
        )
    ) {

        node.forEach(
            item =>
                collectText(
                    item,
                    values
                )
        );

        return;
    }

    if (
        typeof node === "object"
    ) {

        Object.values(
            node
        ).forEach(
            value =>
                collectText(
                    value,
                    values
                )
        );
    }
}

export default RP6;
