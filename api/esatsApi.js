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

export async function getApplicationVersions(
    assetId
) {

    const url =
        replaceTokens(
            URLS.ESATS_VERSIONS,
            {
                assetId
            }
        );

    return fetchJson(url);
}

export async function getVersionArtifacts(
    versionEsatsId
) {

    const url =
        replaceTokens(
            URLS.ESATS_ARTIFACTS,
            {
                versionEsatsId
            }
        );

    return fetchJson(url);
}

export async function getAllArtifacts(
    assetId
) {

    const versionsResponse =
        await getApplicationVersions(
            assetId
        );

    const versions =
        versionsResponse
            .businessApplicationVersions
            || [];

    const artifactRequests =
        versions.map(
            version =>
                getVersionArtifacts(
                    version.esatsId
                )
        );

    const artifactResults =
        await Promise.all(
            artifactRequests
        );

    return {

        versions,

        artifacts:
            artifactResults.flat()
    };
}