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

export async function getReviewSummary(
    assetId
) {

    const url =
        replaceTokens(
            URLS.REVIEW_SUMMARY,
            {
                assetId
            }
        );

    return fetchJson(url);
}