import {
    fail,
    includesValue,
    isYes,
    notApplicable,
    pass,
    valueContainsAny
}
from "./helpers.js";

const RP10 = {
    id: "RP10",
    name: "Applications requiring service accounts answer Yes",
    category: "Users",

    async validate(context) {

        const databaseUsed =
            isYes(
                context,
                "CSIR-Database"
            );

        const serviceAccountExpected =
            databaseUsed ||

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
                "Application characteristics do not indicate required service account usage."
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
                databaseUsed
                    ? "Database usage is present and service accounts are identified."
                    : "Application type indicates service account usage and CSIR-SvcAcct is Yes."
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
                databaseUsed
                    ? "CSIR-Database is Yes, therefore service accounts are expected, but CSIR-SvcAcct is No."
                    : "Application type indicates service account usage, but CSIR-SvcAcct is No."
            );
        }

        return fail(
            this.id,
            databaseUsed
                ? "CSIR-Database is Yes, but CSIR-SvcAcct is not answered."
                : "Application type indicates service account usage, but CSIR-SvcAcct is not answered."
        );
    }
};

export default RP10;
