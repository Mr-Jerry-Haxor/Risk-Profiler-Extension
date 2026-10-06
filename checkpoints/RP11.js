import {
    fail,
    includesValue,
    isYes,
    notApplicable,
    pass,
    valueContainsAny
}
from "./helpers.js";

const RP11 = {
    id: "RP11",
    name: "Applications requiring service accounts answer Yes",
    category: "Users",
    // ACP must be verified even when a Risk Profiler question is absent.
    requiredQuestions: [],

    async validate(context) {

        const acp = context.acp;
        if (!acp || acp.status === "error" || !["found", "no-match", "no-assessment"].includes(acp.status) ||
            (acp.status === "found" && !["yes", "no"].includes(acp.serviceAccountAnswer))) {
            return fail(this.id, `Unable to verify ACP service-account evidence before evaluating RP11: ${acp?.error || "ACP lookup was not completed."}`);
        }
        const acpHasServiceAccounts = acp.status === "found" && acp.serviceAccountAnswer === "yes";
        const acpEvidence = acp.status === "found"
            ? `Exact ACP asset-name match "${acp.assetName}", ${acp.source} assessment ${acp.assessmentId}: ACP-NPI1 is ${acp.serviceAccountAnswer === "yes" ? "Yes" : "No"}.`
            : acp.status === "no-match"
                ? `No exact ACP asset-name match for "${acp.assetName}".`
                : `Exact ACP asset-name match "${acp.assetName}" has no incomplete or last assessment.`;

        const databaseUsed =
            isYes(
                context,
                "CSIR-Database"
            );

        const serviceAccountExpected =
            acpHasServiceAccounts || databaseUsed ||

            valueContainsAny(
                context,
                "CSIR-AppType",
                [
                    "Web application",
                    "Web service",
                    "API",
                    "Client-Server",
                    "Dashboard / BI",
                    "PowerBI",
                    "Cognos",
                    "Tableau",
                    "Database / Data Warehouse",
                    "Data Mart",
                    "Analytics platform"
                ]
            );

        if (
            !serviceAccountExpected
        ) {

            return notApplicable(
                this.id,
                `Application characteristics do not indicate required service account usage. ${acpEvidence}`
            );
        }

        if (
            isYes(
                context,
                "CSIR-SvcAcct"
            )
        ) {

            return pass(
                this.id,
                acpHasServiceAccounts
                    ? `${acpEvidence} CSIR-SvcAcct is Yes.`
                    : databaseUsed
                    ? `Database usage is present and service accounts are identified. ${acpEvidence}`
                    : `Application type indicates service account usage and CSIR-SvcAcct is Yes. ${acpEvidence}`
            );
        }

        if (
            includesValue(
                context,
                "CSIR-SvcAcct",
                "No"
            )
        ) {

            return fail(
                this.id,
                acpHasServiceAccounts
                    ? `${acpEvidence} Service accounts are expected, but CSIR-SvcAcct is No.`
                    : databaseUsed
                    ? `CSIR-Database is Yes, therefore service accounts are expected, but CSIR-SvcAcct is No. ${acpEvidence}`
                    : `Application type indicates service account usage, but CSIR-SvcAcct is No. ${acpEvidence}`
            );
        }

        return fail(
            this.id,
            acpHasServiceAccounts
                ? `${acpEvidence} Service accounts are expected, but CSIR-SvcAcct is not Yes (unanswered or another value).`
                : databaseUsed
                ? `CSIR-Database is Yes, but CSIR-SvcAcct is not Yes (unanswered or another value). ${acpEvidence}`
                : `Application type indicates service account usage, but CSIR-SvcAcct is not Yes (unanswered or another value). ${acpEvidence}`
        );
    }
};

export default RP11;
