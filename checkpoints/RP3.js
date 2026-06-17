import {
    fail,
    includesValue,
    isWebLikeApplication,
    notApplicable,
    pass,
    valueContainsAny
}
from "./helpers.js";

const RP3 = {
    id: "RP3",
    name: "MFA via WSSO is used only with web-based application types",
    category: "Architecture Overview",

    async validate(context) {

        const wssoSelected =
            includesValue(
                context,
                "CSIR-MFA",
                "MFA via Web Single Sign On (WSSO)"
            );

        if (
            !wssoSelected
        ) {

            return notApplicable(
                this.id,
                "MFA via Web Single Sign On (WSSO) is not selected."
            );
        }

        if (
            isWebLikeApplication(
                context
            )
        ) {

            return pass(
                this.id,
                "WSSO is selected and the application type is web-based."
            );
        }

        // Non-web app type with WSSO — check if Boeing holds the IP
        const boeingOwnsIp =
            valueContainsAny(
                context,
                "CSIR-IPOwner",
                [
                    "Boeing"
                ]
            );

        return boeingOwnsIp
            ? pass(
                this.id,
                "WSSO is selected and the application's intellectual property is Boeing-owned."
            )
            : fail(
                this.id,
                "WSSO is selected, but the application type is not Web application, Web service/API, or SaaS, and IP is not Boeing-owned."
            );
    }
};

export default RP3;
