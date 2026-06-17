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
    name: "Applications likely to need service accounts answer Yes",
    category: "Users",

    async validate(context) {

        const serviceAccountExpected =
            valueContainsAny(
                context,
                "CSIR-AppType",
                [
                    "Web application",
                    "Web service",
                    "Client-Server application",
                    "Database / Data Warehouse / Data Mart",
                    "Dashboard / BI"
                ]
            ) ||
            isYes(
                context,
                "CSIR-Database"
            );

        if (
            !serviceAccountExpected
        ) {

            return notApplicable(
                this.id,
                "Application type/database answers do not indicate expected service account usage."
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
                "Service accounts are expected and CSIR-SvcAcct is Yes."
            );
        }

        return includesValue(
            context,
            "CSIR-SvcAcct",
            "No"
        )
            ? fail(
                this.id,
                "Service accounts are expected, but CSIR-SvcAcct is No."
            )
            : fail(
                this.id,
                "Service accounts are expected, but CSIR-SvcAcct is not answered."
            );
    }
};

export default RP10;
