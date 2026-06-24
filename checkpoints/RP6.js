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


        const referenceCode =
            extractReferenceClassification(
                context?.exportControl
            );

        

        /*
         * SaaS applications must be
         * Not Subject to Export Controls OR 
         * match the Export Control reference
         */
        if (isSaas(context)) {
            const isCompliant = selectedCodes.includes("NOT_SUBJECT") || 
                                (referenceCode && selectedCodes.includes(referenceCode));

            return isCompliant
                ? pass(this.id, "Application is SaaS and classification is valid based on Export Control reference.")
                : fail(this.id, `Application is SaaS, but selected classification (${selectedClassifications.join(", ")}) does not match required criteria.`);
        }

        

        if (
            !referenceCode
        ) {

            return notApplicable(
                this.id,
                "Unable to determine Export Control classification from GTC."
            );
        }

        const matches =
            selectedCodes.includes(
                referenceCode
            );

        return matches
            ? pass(
                this.id,
                `Selected classification matches Export Control reference (${referenceCode}).`
            )
            : fail(
                this.id,
                `Selected classification (${selectedClassifications.join(", ")}) does not match Export Control reference (${referenceCode}).`
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
            "ear or ear-nlr"
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

    return null;
}

function extractReferenceClassification(
    exportControl
) {

    const record =
        exportControl?.[0];

    const term =
        record?.terms?.[0]?.term;

    if (
        !term
    ) {
        return null;
    }

    /*
     * Primary source:
     * Export Control Group
     *
     * EARL
     * EARN
     * ITAR
     */
    const exportControlGroup =
        (term?.associated || [])
            .flatMap(
                association =>
                    association?.fields || []
            )
            .map(
                field =>
                    field?.field?.name
            )
            .find(
                value =>
                    [
                        "EARL",
                        "EARN",
                        "ITAR"
                    ].includes(
                        String(
                            value || ""
                        ).toUpperCase()
                    )
            );

    if (
        exportControlGroup
    ) {

        return mapExportControlClassification(
            exportControlGroup
        );
    }

    /*
     * NSR
     */
    const displayName =
        term?.displayName;

    if (
        normalize(
            displayName
        ) === "nsr"
    ) {

        return "NOT_SUBJECT";
    }

    /*
     * Export Control Group Full Name
     *
     * Not Subject to EAR or ITAR
     */
    const equivalenceText =
        (term?.equivalence || [])
            .flatMap(
                item =>
                    item?.fields || []
            )
            .map(
                field =>
                    field?.field?.name || ""
            )
            .join(
                " "
            );

    if (
        normalize(
            equivalenceText
        ).includes(
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

    if (
        normalized === "earl"
    ) {
        return "EAR_LR";
    }

    if (
        normalized === "earn"
    ) {
        return "EAR_NLR";
    }

    if (
        normalized === "itar"
    ) {
        return "ITAR";
    }

    return null;
}

export default RP6;
