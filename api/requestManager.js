const memoryCache = new Map();

const ESATS_PAGE_ORIGIN = "https://esats.web.boeing.com";

const ESATS_GATEWAY_HOST = "service-gateway.tas-phx.apps.boeing.com";

const GTC_PAGE_ORIGIN = "https://gtc-ecm.web.boeing.com";

const GTC_API_HOST = "termbank.web.boeing.com";

const DEFAULT_OPTIONS = {
    retries: 3,
    retryDelay: 1000,
    useCache: true
};

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isEsatsGatewayUrl(url) {

    try {

        return new URL(url).hostname ===
            ESATS_GATEWAY_HOST;

    } catch {

        return false;
    }
}

function isGtcApiUrl(url) {

    try {

        return new URL(url).hostname ===
            GTC_API_HOST;

    } catch {

        return false;
    }
}

function hasChromeScripting() {

    return typeof chrome !== "undefined" &&
        chrome.tabs &&
        chrome.scripting;
}

function queryTabs(queryInfo) {

    return new Promise(resolve => {

        chrome.tabs.query(
            queryInfo,
            resolve
        );
    });
}

async function findTrustedPageTab(pageOrigin) {

    const tabs =
        await queryTabs({
            url:
                `${pageOrigin}/*`
        });

    return tabs.find(
        tab =>
            tab.id &&
            tab.status === "complete"
    ) ||
        tabs.find(
            tab =>
                tab.id
        );
}

function executeScript(details) {

    return new Promise((
        resolve,
        reject
    ) => {

        chrome.scripting.executeScript(
            details,
            results => {

                const error =
                    chrome.runtime.lastError;

                if (error) {

                    reject(
                        new Error(
                            error.message
                        )
                    );

                    return;
                }

                resolve(results);
            }
        );
    });
}

async function fetchFromTrustedPage(
    url,
    {
        pageOrigin,
        label,
        useBearerToken
    }
) {

    if (!hasChromeScripting()) {

        throw new Error(
            `${label} requests require the Chrome scripting permission.`
        );
    }

    const tab =
        await findTrustedPageTab(
            pageOrigin
        );

    if (!tab) {

        throw new Error(
            `Open ${label} in this browser and sign in before running ${label} validation requests.`
        );
    }

    const results =
        await executeScript({

            target: {
                tabId:
                    tab.id
            },

            world:
                "MAIN",

            args: [
                url,
                useBearerToken,
                pageOrigin
            ],

            func:
                async (
                    requestUrl,
                    shouldUseBearerToken,
                    pageOrigin
                ) => {

                    

                    function normalizeToken(rawValue) {
                        if (!rawValue) return null;
                    
                        let value = String(rawValue).trim();
                    
                        if (value.startsWith("Bearer ")) {
                            value = value.slice(7).trim();
                        }
                    
                        try {
                            const parsed = JSON.parse(value);
                    
                            if (typeof parsed === "string") {
                                value = parsed.trim();
                            } else if (parsed && typeof parsed === "object") {
                                value =
                                    parsed.esatsToken ||
                                    parsed.access_token ||
                                    parsed.token ||
                                    parsed.value ||
                                    value;
                            }
                        } catch {
                            // ignore
                        }
                    
                        return value || null;
                    }
                    
                    const token =
                        shouldUseBearerToken
                            ? normalizeToken(localStorage.getItem("esatsToken"))
                            : null;
                        

                    const headers = {
                        Accept:
                            "application/json, text/plain, */*"
                    };

                    if (
                        shouldUseBearerToken &&
                        token
                    ) {

                        headers.Authorization =
                            `Bearer ${token}`;
                    }

                    try {

                        const maxRetries = 3;
                        const retryDelay = 1000;

                        let response = null;
                        let lastFetchError = null;

                        for (let attempt = 1; attempt <= maxRetries; attempt++) {
                            try {
                                response = await fetch(requestUrl, {
                                    method: "GET",
                                    headers,
                                    credentials: "omit",
                                    cache: "no-store",
                                    referrer: `${pageOrigin}/`,
                                    referrerPolicy: "strict-origin-when-cross-origin"
                                });
                                
                                if (response.ok) {
                                    break;
                                }
                                
                                lastFetchError = new Error(`${response.status} ${response.statusText}`);
                            } catch (error) {
                                lastFetchError = error;
                            }

                            if (attempt < maxRetries) {
                                await new Promise(resolve => setTimeout(resolve, retryDelay));
                            }
                        }

                        if (!response || !response.ok) {
                            throw lastFetchError || new Error("Request failed");
                        }

                        const text =
                            await response.text();

                        let data = null;

                        if (text) {

                            try {

                                data =
                                    JSON.parse(text);

                            } catch {

                                data = text;
                            }
                        }

                        return {
                            ok:
                                response.ok,
                            status:
                                response.status,
                            statusText:
                                response.statusText,
                            url:
                                response.url,
                            hasAuthorization:
                                shouldUseBearerToken
                                    ? !!token
                                    : true,
                            data
                        };

                    } catch (error) {

                        console.log("ESATS token:", token);
                        console.log("Request URL:", requestUrl);
                        console.log("Headers:", headers);
                        return {
                            ok:
                                false,
                            status:
                                0,
                            statusText:
                                error.message || "Request failed",
                            hasAuthorization:
                                shouldUseBearerToken
                                    ? !!token
                                    : true,
                            error:
                                error.message
                        };
                    }
                }
        });

    const result =
        results?.[0]?.result;

    if (!result) {

        throw new Error(
            `${label} request did not return a response.`
        );
    }

    if (!result.ok) {

        const authHint =
            result.hasAuthorization
                ? ""
                : " No ESATS bearer token was found in the ESATS tab.";

        throw new Error(
            `${label} request failed: ${result.status} ${result.statusText}.${authHint}`
        );
    }

    return result.data;
}

async function fetchFromEsatsPage(url) {

    return fetchFromTrustedPage(
        url,
        {
            pageOrigin:
                ESATS_PAGE_ORIGIN,
            label:
                "ESATS",
            useBearerToken:
                true
        }
    );
}

async function fetchFromGtcPage(url) {

    return fetchFromTrustedPage(
        url,
        {
            pageOrigin:
                GTC_PAGE_ORIGIN,
            label:
                "GTC",
            useBearerToken:
                false
        }
    );
}

export async function fetchJson(
    url,
    options = {}
) {

    const config = {
        ...DEFAULT_OPTIONS,
        ...options
    };

    if (
        config.useCache &&
        memoryCache.has(url)
    ) {
        return memoryCache.get(url);
    }

    let lastError;

    for (
        let attempt = 1;
        attempt <= config.retries;
        attempt++
    ) {

        try {

            if (
                isEsatsGatewayUrl(url)
            ) {

                const data =
                    await fetchFromEsatsPage(
                        url
                    );

                if (config.useCache) {

                    memoryCache.set(
                        url,
                        data
                    );
                }

                return data;
            }

            if (
                isGtcApiUrl(url)
            ) {

                const data =
                    await fetchFromGtcPage(
                        url
                    );

                if (config.useCache) {

                    memoryCache.set(
                        url,
                        data
                    );
                }

                return data;
            }

            const response =
                await fetch(url, {
                    credentials:
                        "include",

                    headers: {
                        Accept:
                            "application/json, text/plain, */*"
                    },

                    cache:
                        "no-store"
                });

            if (!response.ok) {

                throw new Error(
                    `${response.status} ${response.statusText}`
                );
            }

            const data =
                await response.json();

            if (config.useCache) {

                memoryCache.set(
                    url,
                    data
                );
            }

            return data;

        } catch (error) {

            lastError = error;

            if (
                attempt <
                config.retries
            ) {

                await sleep(
                    config.retryDelay
                );
            }
        }
    }

    throw lastError;
}

export function clearCache() {

    memoryCache.clear();
}
