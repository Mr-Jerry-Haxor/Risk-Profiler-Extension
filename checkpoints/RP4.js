import {
    deploymentPhase,
    fail,
    getValues,
    isSaas,
    normalize,
    notApplicable,
    pass
}
from "./helpers.js";

const RP4 = {
    id: "RP4",
    name: "Production non-SaaS applications have a deployed device count",
    category: "Architecture Overview",

    async validate(context) {

        const phase =
            normalize(
                deploymentPhase(
                    context
                )
            );

        if (
            !phase.includes(
                "production"
            )
        ) {

            return notApplicable(
                this.id,
                "Application is not in Production."
            );
        }

        if (
            isSaas(
                context
            )
        ) {

            return notApplicable(
                this.id,
                "Application is SaaS."
            );
        }

        const deviceCounts =
            getValues(
                context,
                "CSIR-DeviceCount"
            );

        if (
            deviceCounts.length === 0
        ) {

            return fail(
                this.id,
                "Production non-SaaS application has no device count answer."
            );
        }

        const notDeployed =
            deviceCounts.some(
                value =>
                    normalize(
                        value
                    ).includes(
                        "not installed/deployed on any device"
                    )
            );

        return notDeployed
            ? fail(
                this.id,
                "Production non-SaaS application is marked as not installed/deployed on any device."
            )
            : pass(
                this.id,
                `Production non-SaaS application has device count: ${deviceCounts.join(", ")}.`
            );
    }
};

export default RP4;
