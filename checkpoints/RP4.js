import {
    fail,
    getValues,
    normalize,
    notApplicable,
    pass
}
from "./helpers.js";

const DEVICE_DEPLOYED_TYPES = [

    "web application",

    "web service",

    "client-server application",

    "desktop application",

    "mobile application",

    "database",

    "containerized",

    "embedded device",

    "infrastructure-as-a-service",

    "integration platform",

    "mainframe application",

    "script / automation",

    "security or management service",

    "thick client",

    "thin client",

    "virtual desktop",

    "dashboard / bi",

    "api gateway"
];

const RP4 = {
    id: "RP4",
    name: "Installed/deployed applications have a valid device count",
    category: "Architecture Overview",
    requiredQuestions: [
    "CSIR-AppType",
    "CSIR-DeviceCount"
    ],

    async validate(context) {

        const appTypes =
            getValues(
                context,
                "CSIR-AppType"
            );

        if (
            appTypes.length === 0
        ) {

            return notApplicable(
                this.id,
                "CSIR-AppType is not answered."
            );
        }

        const requiresDeviceCount =
            appTypes.some(
                appType => {

                    const normalizedAppType =
                        normalize(
                            appType
                        );

                    return DEVICE_DEPLOYED_TYPES.some(
                        deviceType =>
                            normalizedAppType.includes(
                                deviceType
                            )
                    );
                }
            );

        if (
            !requiresDeviceCount
        ) {

            return notApplicable(
                this.id,
                "Selected application types do not require device count validation."
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

            return notApplicable(
                this.id,
                "CSIR-DeviceCount is not answered."
            );
        }

        const selectedDeviceCount =
            normalize(
                deviceCounts[0]
            );

        const notInstalled =
            selectedDeviceCount.includes(
                "not installed/deployed on any device"
            );

        if (
            notInstalled
        ) {

            return fail(
                this.id,
                "Device count is set to 'Not installed/deployed on any device'."
            );
        }

        return pass(
            this.id,
            `Valid device count selected: ${deviceCounts[0]}.`
        );
    }
};

export default RP4;
