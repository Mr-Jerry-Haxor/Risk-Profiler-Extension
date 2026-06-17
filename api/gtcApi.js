import {
    URLS
}
from "../utils/constants.js";

import {
    replaceTokens
}
from "../utils/helpers.js";

import {
    fetchJson
}
from "./requestManager.js";

export async function getExportControlCode(
    code
) {

    const url =
        replaceTokens(
            URLS.GTC_LOOKUP,
            {
                name: code
            }
        );

    return fetchJson(url);
}

export async function getExportControlData(
    artifacts
) {

    const exportArtifacts =
        artifacts.filter(
            item =>
                item.policyRuleId === 2
        );

    const requests =
        exportArtifacts.map(
            artifact =>
                getExportControlCode(
                    artifact.artifactName
                )
        );

    const responses =
        await Promise.allSettled(
            requests
        );

    return responses
        .filter(
            x =>
                x.status ===
                "fulfilled"
        )
        .map(
            x =>
                x.value
        );
}