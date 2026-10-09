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

        const jcdArtifacts = (context.artifacts || [])
            .filter(item => Number(item.policyRuleId) === 2)
            .map(item => ({
                artifact: item,
                value: String(item.artifactName || "").trim()
            }))
            .filter(item => item.value);

        const esatsValues = [...new Set(jcdArtifacts.map(item => item.value))];

        if (isSaas(context) && esatsValues.length === 0) {
            return notApplicable(this.id, "SaaS application: ESATS has no JCD value, so code classification validation is not applicable.");
        }

        const records = context.exportControl || [];
        const details = records.map(formatRecordEvidence).join(" ");
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
        const versionResults = jcdArtifacts.map((item, index) => {
            const record = findRecordForJcd(records, item.value, esatsValues);
            const reference = record ? extractReferenceClassification([record]) : null;
            return {
                ...item,
                record,
                reference,
                matches: Boolean(reference && selectedCodes.includes(reference)),
                version: formatEsatsVersion(item.artifact?.esatsVersion, index)
            };
        });
        const matchingVersions = versionResults.filter(item => item.matches);
        const otherVersions = versionResults.filter(item => !item.matches);

        if (matchingVersions.length > 0 ||
            (versionResults.length === 0 && references.some(reference => reference && selectedCodes.includes(reference)))) {
            const matchingEvidence = matchingVersions.length
                ? matchingVersions.map(item => formatVersionResult(item, selectedClassifications)).join(" ")
                : details;
            const otherEvidence = otherVersions.length
                ? ` Other version/JCD results: ${otherVersions.map(item => formatVersionResult(item, selectedClassifications)).join(" ")}`
                : "";
            return pass(
                this.id,
                `At least one ESATS application version/JCD matches CSIR-CodeClassification (${selectedClassifications.join(", ")}). ` +
                `Matching version/JCD: ${matchingEvidence}${otherEvidence}`
            );
        }

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

        return fail(
            this.id,
            `No ESATS application version/JCD matches selected classification (${selectedClassifications.join(", ")}). ` +
            `Version/JCD results: ${versionResults.map(item => formatVersionResult(item, selectedClassifications)).join(" ") || evidence}`
        );
    }
};

function findRecordForJcd(records, value, esatsValues) {
    const exact = records.find(record => record.lookup?.esatsValue === value);
    if (exact) return exact;
    // Legacy contexts predate lookup metadata and contain one record per JCD.
    if (esatsValues.length === 1 && records.length === 1 && !records[0]?.lookup) return records[0];
    return null;
}

function formatEsatsVersion(version, index) {
    if (!version || typeof version !== "object") return `ESATS version unavailable (JCD record ${index + 1})`;
    const name = version.versionName ?? version.businessApplicationVersionName ??
        version.displayName ?? version.name ?? version.versionNumber ?? version.version;
    const id = version.esatsId ?? version.versionEsatsId ?? version.id;
    if (name && id) return `ESATS version ${name} (ID ${id})`;
    if (name) return `ESATS version ${name}`;
    if (id) return `ESATS version ID ${id}`;
    return `ESATS version unavailable (JCD record ${index + 1})`;
}

function formatVersionResult(result, selectedClassifications) {
    const lookup = result.record?.lookup;
    const reference = result.reference || "unavailable";
    const attempts = (lookup?.attempts || []).map(attempt =>
        `${attempt.value}: ${attempt.status}${attempt.error ? ` (${attempt.error})` : ""}`
    ).join("; ");
    const comparison = result.matches
        ? `matches selected classification (${selectedClassifications.join(", ")}) and is accepted`
        : result.reference
            ? `differs from selected classification (${selectedClassifications.join(", ")})`
            : "could not be mapped to a GTC classification";
    return `${result.version}: ESATS JCD: ${result.value}; GTC reference: ${lookup?.gtcValue || "not found"}` +
        `${lookup?.fallback ? " (parent-code fallback)" : ""}; classification: ${reference}; ${comparison}.` +
        `${lookup ? ` Lookup attempts: ${attempts || "none"}.${lookup.error ? ` Error: ${lookup.error}` : ""}` : ""}`;
}

function formatRecordEvidence(record) {
    const lookup = record?.lookup;
    const reference = extractReferenceClassification([record]);
    if (!lookup) return `GTC classification: ${reference || "unavailable"}.`;
    const attempted = (lookup.attempts || []).map(attempt =>
        `${attempt.value}: ${attempt.status}${attempt.error ? ` (${attempt.error})` : ""}`
    ).join("; ");
    return `ESATS JCD: ${lookup.esatsValue}; GTC reference: ${lookup.gtcValue || "not found"}` +
        `${lookup.fallback ? " (parent-code fallback)" : ""}; classification: ${reference || "unavailable"}. ` +
        `Lookup attempts: ${attempted || "none"}.${lookup.error ? ` Error: ${lookup.error}` : ""}`;
}

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
