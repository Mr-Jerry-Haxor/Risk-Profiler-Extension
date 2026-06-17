import {
    fail,
    includesValue,
    isWebLikeApplication,
    notApplicable,
    pass
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

        return isWebLikeApplication(
            context
        )
            ? pass(
                this.id,
                "WSSO is selected and the application type is web-based."
            )
            : fail(
                this.id,
                "WSSO is selected, but the application type is not Web application, Web service/API, or SaaS."
            );
    }
};

export default RP3;
