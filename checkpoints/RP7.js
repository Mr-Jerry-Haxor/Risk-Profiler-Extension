import {
    fail,
    getValues,
    isSaas,
    normalize,
    notApplicable,
    pass
}
from "./helpers.js";

const RP7 = {
    id: "RP7",

    name: "Code classification matches Export Control reference",

    category: "Information Types",

    requiredQuestions: [
        "CSIR-CodeClassification"
    ],

    async validate(context) {

        const esatsValues = [...new Set((context.artifacts || [])
            .filter(item => Number(item.policyRuleId) === 2)
            .map(item => String(item.artifactName || "").trim())
            .filter(Boolean))];

        if (isSaas(context) && esatsValues.length === 0) {
            return notApplicable(this.id, "SaaS application: ESATS has no JCD value, so code classification validation is not applicable.");
        }

        const records = context.exportControl || [];
        const details = records.map(record => {
            const lookup = record.lookup;
            const reference = extractReferenceClassification([record]);
            if (!lookup) return `GTC classification: ${reference || "unavailable"}.`;
            const attempted = (lookup.attempts || []).map(attempt =>
                `${attempt.value}: ${attempt.status}${attempt.error ? ` (${attempt.error})` : ""}`
            ).join("; ");
            return `ESATS JCD: ${lookup.esatsValue}; GTC reference: ${lookup.gtcValue || "not found"}` +
                `${lookup.fallback ? " (parent-code fallback)" : ""}; classification: ${reference || "unavailable"}. ` +
                `Lookup attempts: ${attempted || "none"}.${lookup.error ? ` Error: ${lookup.error}` : ""}`;
        }).join(" ");
        const evidence = `ESATS JCD value(s): ${esatsValues.join(", ") || "none"}. ${details}`;

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
                `CSIR-CodeClassification is not answered. ${evidence}`
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
                `Unable to determine classification from answer: ${selectedClassifications.join(", ")}. ${evidence}`
            );
        }


        const references = records.map(record => extractReferenceClassification([record]));
        const missingValues = esatsValues.filter(value => !records.some(record => record.lookup?.esatsValue === value));
        // Legacy contexts have no lookup metadata; preserve their mapped reference support.
        const missingLookup = records.some(record => record.lookup) && missingValues.length > 0;
        if (esatsValues.length > 0 && (records.length === 0 || references.some(value => !value) || missingLookup)) {
            return fail(this.id, `Unable to determine Export Control classification for the ESATS JCD. ${evidence}` +
                (missingLookup ? ` Missing GTC lookup details for: ${missingValues.join(", ")}.` : ""));
        }
        if (references.length === 0 || references.every(value => !value)) {
            return notApplicable(this.id, `Unable to determine Export Control classification from GTC. ${evidence}`);
        }

        const matches = references.every(reference => reference && selectedCodes.includes(reference));

        return matches
            ? pass(
                this.id,
                `Selected classification (${selectedClassifications.join(", ")}) matches Export Control reference (${[...new Set(references)].join(", ")}). ${evidence}`
            )
            : fail(
                this.id,
                `Selected classification (${selectedClassifications.join(", ")}) does not match Export Control reference (${[...new Set(references)].join(", ")}). ${evidence}`
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

export default RP7;
