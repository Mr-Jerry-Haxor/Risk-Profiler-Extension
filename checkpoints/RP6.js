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

    name: "Code classification matches Export Control reference",

    category: "Information Types",

    requiredQuestions: [
        "CSIR-CodeClassification"
    ],

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
            selectedClassifications
                .map(
                    classificationCode
                )
                .filter(Boolean);

        if (
            selectedCodes.length === 0
        ) {

            return fail(
                this.id,
                `Unable to determine classification from answer: ${selectedClassifications.join(", ")}.`
            );
        }

        /*
         * SaaS applications must be
         * Not Subject to Export Controls
         */
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

        /*
         * Export Control Group from ESATS/GTC
         */
        const exportControlGroup =
            context?.exportControl?.term?.associated?.[0]
                ?.fields?.[0]
                ?.field?.name ||
            null;

        const referenceCode =
            mapExportControlClassification(
                exportControlGroup
            );

        if (
            !referenceCode
        ) {

            return notApplicable(
                this.id,
                `Unknown Export Control Group value: ${exportControlGroup || "null"}`
            );
        }

        const matches =
            selectedCodes.includes(
                referenceCode
            );

        return matches
            ? pass(
                this.id,
                `Selected classification matches Export Control Group (${referenceCode}).`
            )
            : fail(
                this.id,
                `Selected classification (${selectedClassifications.join(", ")}) does not match Export Control Group (${referenceCode}).`
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
            "ear-nlr"
        )
    ) {
        return "EAR_NLR";
    }

    if (
        normalized.includes(
            "ear-lr"
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

    if (
        normalized.includes(
            "not subject"
        )
    ) {
        return "NOT_SUBJECT";
    }

    return null;
}

function mapExportControlClassification(
    value
) {

    const normalized =
        normalize(
            value
        );

    /*
     * No export control group
     * => Not Subject
     */
    if (
        !normalized
    ) {
        return "NOT_SUBJECT";
    }

    /*
     * EAR License Required
     */
    if (
        normalized === "earl"
    ) {
        return "EAR_LR";
    }

    /*
     * EAR No License Required
     */
    if (
        normalized === "earn"
    ) {
        return "EAR_NLR";
    }

    /*
     * ITAR
     */
    if (
        normalized === "itar"
    ) {
        return "ITAR";
    }

    return null;
}

export default RP6;
