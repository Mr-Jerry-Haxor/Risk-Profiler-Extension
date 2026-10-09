import {
    fail,
    getValues,
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
        if (!acp || acp.status === "error" ||
            !["found", "no-match", "no-assessment", "question-missing", "question-unanswered"].includes(acp.status) ||
            (acp.status === "found" && !["yes", "no"].includes(acp.serviceAccountAnswer))) {
            return fail(this.id, `Unable to verify ACP service-account evidence before evaluating RP11: ${acp?.error || "ACP lookup was not completed."}`);
        }
        const acpHasServiceAccounts = acp.status === "found" && acp.serviceAccountAnswer === "yes";
        const acpEvidence = acp.status === "found"
            ? `Exact ACP asset-name match "${acp.assetName}", ${acp.source} assessment ${acp.assessmentId}: ACP-NPI1 is ${acp.serviceAccountAnswer === "yes" ? "Yes" : "No"}.`
            : acp.status === "no-match"
                ? `No ACP exists with an exact asset-name match for "${acp.assetName}"; ACP is ignored and RP11 is evaluated from Risk Profiler evidence.`
                : acp.status === "no-assessment"
                    ? `Exact ACP asset-name match "${acp.assetName}" has no incomplete or last assessment; ACP is ignored and RP11 is evaluated from Risk Profiler evidence.`
                    : acp.status === "question-missing"
                        ? `Exact ACP asset-name match "${acp.assetName}", ${acp.source} assessment ${acp.assessmentId}: ACP-NPI1 is missing; ACP is ignored and RP11 is evaluated from Risk Profiler evidence.`
                        : `Exact ACP asset-name match "${acp.assetName}", ${acp.source} assessment ${acp.assessmentId}: ACP-NPI1 is unanswered; ACP is ignored and RP11 is evaluated from Risk Profiler evidence.`;

        const appTypes =
            getValues(
                context,
                "CSIR-AppType"
            );

        const serviceAccountValues =
            getValues(
                context,
                "CSIR-SvcAcct"
            );

        const databaseUsed =
            isYes(
                context,
                "CSIR-Database"
            );

        const appTypeRequiresServiceAccount =
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

        const serviceAccountExpected =
            acpHasServiceAccounts || databaseUsed || appTypeRequiresServiceAccount;

        const rpEvidence =
            `Risk Profiler evidence: CSIR-AppType is ${appTypes.join(", ") || "unanswered"}; ` +
            `CSIR-Database is ${databaseUsed ? "Yes" : "not Yes"}; ` +
            `CSIR-SvcAcct is ${serviceAccountValues.join(", ") || "unanswered"}.`;

        if (
            !serviceAccountExpected
        ) {

            return notApplicable(
                this.id,
                `Application characteristics do not indicate required service account usage. ${rpEvidence} ${acpEvidence}`
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
                    ? `${acpEvidence} CSIR-SvcAcct is Yes. ${rpEvidence}`
                    : databaseUsed
                    ? `Database usage is present and service accounts are identified. ${rpEvidence} ${acpEvidence}`
                    : `Application type indicates service account usage and CSIR-SvcAcct is Yes. ${rpEvidence} ${acpEvidence}`
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
                    ? `${acpEvidence} Service accounts are expected, but CSIR-SvcAcct is No. ${rpEvidence}`
                    : databaseUsed
                    ? `CSIR-Database is Yes, therefore service accounts are expected, but CSIR-SvcAcct is No. ${rpEvidence} ${acpEvidence}`
                    : `Application type indicates service account usage, but CSIR-SvcAcct is No. ${rpEvidence} ${acpEvidence}`
            );
        }

        return fail(
            this.id,
            acpHasServiceAccounts
                ? `${acpEvidence} Service accounts are expected, but CSIR-SvcAcct is not Yes (unanswered or another value). ${rpEvidence}`
                : databaseUsed
                ? `CSIR-Database is Yes, but CSIR-SvcAcct is not Yes (unanswered or another value). ${rpEvidence} ${acpEvidence}`
                : `Application type indicates service account usage, but CSIR-SvcAcct is not Yes (unanswered or another value). ${rpEvidence} ${acpEvidence}`
        );
    }
};

export default RP11;
