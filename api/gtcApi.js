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
                name: encodeURIComponent(code)
            }
        );

    return fetchJson(url);
}

export async function getExportControlData(
    artifacts
) {

    const values = [...new Set((artifacts || [])
        .filter(item => Number(item.policyRuleId) === 2)
        .map(item => String(item.artifactName || "").trim())
        .filter(Boolean))];

    return Promise.all(values.map(lookupExportControl));
}

async function lookupExportControl(esatsValue) {
    const attempts = [];
    let candidate = esatsValue;
    while (candidate) {
        try {
            const data = await getExportControlCode(candidate);
            if (data?.terms?.some(item => item?.term)) {
                attempts.push({ value: candidate, status: "found" });
                return { ...data, lookup: { esatsValue, gtcValue: candidate,
                    fallback: candidate !== esatsValue, attempts } };
            }
            attempts.push({ value: candidate, status: "not-found", error: "GTC returned no terms." });
        } catch (error) {
            attempts.push({ value: candidate, status: "error", error: error.message });
            // Only a missing mapping permits parent fallback. Authentication/network
            // recovery stays on the original endpoint in the shared request manager.
            if (error.status !== 404) {
                return { terms: [], lookup: { esatsValue, gtcValue: null, attempts,
                    error: `GTC lookup failed for ${candidate}: ${error.message}` } };
            }
        }
        const separator = candidate.lastIndexOf(".");
        candidate = separator > 0 ? candidate.slice(0, separator) : "";
    }
    return { terms: [], lookup: { esatsValue, gtcValue: null, attempts,
        error: "No GTC mapping was found for the exact JCD or its parent codes." } };
}
