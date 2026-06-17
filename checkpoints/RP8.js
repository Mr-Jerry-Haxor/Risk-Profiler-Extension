import {
    fail,
    getValues,
    hasAnswer,
    includesValue,
    normalize,
    notApplicable,
    pass
}
from "./helpers.js";

const EXTERNAL_HOSTS = [
    "External (Non-Boeing) / External Boeing Cloud Hosted",
    "External(Non-Boeing) / External Boeing Cloud Hosted",
    "Third Party Vendor (e.g. SaaS/IaaS/PaaS)"
];

const INTERNAL_HOSTS = [
    "Boeing Enterprise Network (BEN)",
    "Boeing Perimeter",
    "Internal Boeing Cloud Hosted",
    "Internal Boeing Cloud Hosted Boeing Enterprise Network (BEN)",
    "Non-Cloud Boeing Enterprise Network (BEN)",
    "Isolated Lab Environment",
    "Secure Access Zone",
    "Secure Hosting Environment (SHE)",
    "Secure Lab Environment"
];

const RP8 = {
    id: "RP8",
    name: "Hosting selection matches internal/external/hybrid architecture",
    category: "Network and Hosting",

    async validate(context) {

        const hosting =
            getValues(
                context,
                "CSIR-Hosting"
            );

        if (
            hosting.length === 0
        ) {

            return notApplicable(
                this.id,
                "CSIR-Hosting is not answered."
            );
        }

        const hasNoneOrOther =
            hosting.some(
                value =>
                    [
                        "none",
                        "other"
                    ].includes(
                        normalize(
                            value
                        )
                    )
            );

        if (
            hasNoneOrOther
        ) {

            return notApplicable(
                this.id,
                "Hosting is None or Other."
            );
        }

        // Case 1: CSIR-IntExtApp question is not present in the assessment at all — not applicable
        if (
            !hasAnswer(
                context,
                "CSIR-IntExtApp"
            )
        ) {

            return notApplicable(
                this.id,
                "CSIR-Hosting is answered but CSIR-IntExtApp question was not found in this assessment."
            );
        }

        const hasExternal =
            hosting.some(
                value =>
                    EXTERNAL_HOSTS.some(
                        host =>
                            normalize(
                                value
                            ) ===
                            normalize(
                                host
                            )
                    )
            );

        const hasInternal =
            hosting.some(
                value =>
                    INTERNAL_HOSTS.some(
                        host =>
                            normalize(
                                value
                            ) ===
                            normalize(
                                host
                            )
                    )
            );

        if (
            hasExternal &&
            hasInternal
        ) {

            return includesValue(
                context,
                "CSIR-IntExtApp",
                "Hybrid"
            )
                ? pass(
                    this.id,
                    "Internal and external hosting selections match Hybrid architecture."
                )
                : fail(
                    this.id,
                    "Internal and external hosting selections require CSIR-IntExtApp = Hybrid."
                );
        }

        if (
            hasExternal
        ) {

            return includesValue(
                context,
                "CSIR-IntExtApp",
                "External"
            )
                ? pass(
                    this.id,
                    "External hosting matches External architecture."
                )
                : fail(
                    this.id,
                    "External hosting requires CSIR-IntExtApp = External."
                );
        }

        if (
            hasInternal
        ) {

            return includesValue(
                context,
                "CSIR-IntExtApp",
                "Internal"
            )
                ? pass(
                    this.id,
                    "Internal hosting matches Internal architecture."
                )
                : fail(
                    this.id,
                    "Internal hosting requires CSIR-IntExtApp = Internal."
                );
        }

        return notApplicable(
            this.id,
            "Hosting answer did not match an internal or external mapping."
        );
    }
};

export default RP8;
