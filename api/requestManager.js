const memoryCache = new Map();
const inFlight = new Map();
const trackedTabs = new Map();
const tabCreations = new Map();

export const SITE_RETRY_INTERVAL_MS = 10000;
const REQUEST_TIMEOUT_MS = 10000;
const SITES = {
    "cairois.web.boeing.com": { id: "cairo", label: "Cairo", origin: "https://cairois.web.boeing.com", direct: true },
    "service-gateway.tas-phx.apps.boeing.com": { id: "esats", label: "ESATS", origin: "https://esats.web.boeing.com", bearer: true },
    "termbank.web.boeing.com": { id: "gtc", label: "GTC", origin: "https://gtc-ecm.web.boeing.com" }
};
let recoveryHandlers = {};

export function setRequestRecoveryHandlers(handlers) {
    recoveryHandlers = handlers || {};
}

export function rememberSiteTab(siteId, tabId) {
    if (tabId) trackedTabs.set(siteId, tabId);
}

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function unwrapApiResponse(value) {
    if (value && typeof value === "object" && !Array.isArray(value) &&
        Object.prototype.hasOwnProperty.call(value, "data") &&
        ["statusCode", "status", "success"].some(key => Object.prototype.hasOwnProperty.call(value, key))) {
        return value.data;
    }
    return value;
}

function requestError(message, status = 0, retryable = true) {
    return Object.assign(new Error(message), { status, retryable });
}

function isRetryableStatus(status) {
    return !status || [401, 403, 408, 425, 429].includes(status) || status >= 500;
}

function chromeCall(method, ...args) {
    return new Promise((resolve, reject) => {
        method(...args, result => {
            const error = chrome.runtime.lastError;
            if (error) reject(requestError(error.message));
            else resolve(result);
        });
    });
}

async function findTrustedPageTab(site) {
    const tabs = await chromeCall(chrome.tabs.query.bind(chrome.tabs), { url: `${site.origin}/*` });
    const existing = tabs.find(tab => tab.id && tab.status === "complete") || tabs.find(tab => tab.id);
    if (existing) {
        trackedTabs.set(site.id, existing.id);
        return existing;
    }
    if (trackedTabs.has(site.id)) {
        try {
            const tab = await chromeCall(chrome.tabs.get.bind(chrome.tabs), trackedTabs.get(site.id));
            if (tab?.id) return tab;
        } catch {
            trackedTabs.delete(site.id);
        }
    }
    if (!tabCreations.has(site.id)) {
        tabCreations.set(site.id, chromeCall(chrome.tabs.create.bind(chrome.tabs), { url: `${site.origin}/` })
            .then(tab => { trackedTabs.set(site.id, tab.id); return tab; })
            .finally(() => tabCreations.delete(site.id)));
    }
    return tabCreations.get(site.id);
}

async function fetchTrustedJson(url, site) {
    if (typeof chrome === "undefined" || !chrome.scripting || !chrome.tabs) {
        throw requestError(`${site.label} requests require the browser scripting permission.`, 0, false);
    }
    const tab = await findTrustedPageTab(site);
    if (tab.status !== "complete" || !tab.url?.startsWith(site.origin + "/")) {
        throw requestError(`${site.label} is waiting for sign-in.`);
    }
    const results = await chromeCall(chrome.scripting.executeScript.bind(chrome.scripting), {
        target: { tabId: tab.id }, world: "MAIN",
        args: [url, Boolean(site.bearer), site.origin, REQUEST_TIMEOUT_MS],
        func: async (requestUrl, useBearerToken, pageOrigin, timeout) => {
            function normalizeToken(raw) {
                if (!raw) return null;
                let value = String(raw).trim();
                try {
                    const parsed = JSON.parse(value);
                    value = typeof parsed === "string" ? parsed :
                        parsed?.esatsToken || parsed?.access_token || parsed?.token || parsed?.value || value;
                } catch { /* Plain tokens are supported too. */ }
                return String(value).replace(/^Bearer\s+/i, "").trim() || null;
            }
            try {
                if (location.origin !== pageOrigin) return { ok: false, status: 401, message: "Waiting for sign-in" };
                const token = useBearerToken ? normalizeToken(localStorage.getItem("esatsToken")) : null;
                if (useBearerToken && !token) return { ok: false, status: 401, message: "Waiting for an ESATS bearer token" };
                const response = await fetch(requestUrl, {
                    method: "GET",
                    headers: { Accept: "application/json, text/plain, */*", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    credentials: "omit",
                    cache: "no-store", referrer: pageOrigin + "/",
                    referrerPolicy: "strict-origin-when-cross-origin",
                    signal: AbortSignal.timeout(timeout)
                });
                if (!response.ok) return { ok: false, status: response.status, message: `HTTP ${response.status}` };
                if (new URL(response.url || requestUrl).hostname !== new URL(requestUrl).hostname) {
                    return { ok: false, status: 401, message: "Redirected to sign-in" };
                }
                const text = await response.text();
                try {
                    return { ok: true, data: JSON.parse(text) };
                } catch {
                    return { ok: false, status: 0, message: "The data endpoint did not return JSON (possibly a sign-in page)" };
                }
            } catch (error) {
                return { ok: false, status: 0, message: error.name === "TimeoutError" ? "Data request timed out" : "Data request unavailable" };
            }
        }
    });
    const result = results?.[0]?.result;
    if (!result?.ok) {
        throw requestError(`${site.label}: ${result?.message || "No data response"}`, result?.status || 0, isRetryableStatus(result?.status));
    }
    return result.data;
}

async function fetchDirectJson(url) {
    const response = await fetch(url, {
        credentials: "include", headers: { Accept: "application/json, text/plain, */*" },
        cache: "no-store", signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    if (!response.ok) throw requestError(`HTTP ${response.status}`, response.status, isRetryableStatus(response.status));
    if (new URL(response.url || url).hostname !== new URL(url).hostname) throw requestError("Redirected to sign-in", 401);
    try {
        return await response.json();
    } catch {
        throw requestError("The data endpoint did not return JSON (possibly a sign-in page).");
    }
}

async function performRequest(url, config, site) {
    let attempt = 0;
    while (true) {
        if (config.shouldCancel?.() || recoveryHandlers.shouldCancel?.()) throw requestError("Request cancelled by user", 0, false);
        attempt++;
        try {
            const data = site && !site.direct ? await fetchTrustedJson(url, site) : await fetchDirectJson(url);
            const status = Number(data?.statusCode || data?.status);
            if (status >= 400) throw requestError(`HTTP ${status}`, status, isRetryableStatus(status));
            const normalized = unwrapApiResponse(data);
            if (config.useCache) memoryCache.set(url, normalized);
            return normalized;
        } catch (error) {
            const keepWaiting = site && config.retryUntilAvailable && error.retryable !== false;
            if (!keepWaiting && (error.retryable === false || attempt >= config.retries)) throw error;
            if (site?.direct && keepWaiting && typeof chrome !== "undefined" && chrome.tabs) {
                try { await findTrustedPageTab(site); } catch { /* Retry the original data request. */ }
            }
            if (keepWaiting) await recoveryHandlers.onRetry?.({ siteId: site.id, siteName: site.label, attempt, retryInMs: SITE_RETRY_INTERVAL_MS });
            await sleep(site ? SITE_RETRY_INTERVAL_MS : config.retryDelay);
        }
    }
}

export async function fetchJson(url, options = {}) {
    const site = SITES[new URL(url).hostname];
    const config = { retries: 3, retryDelay: 1000, useCache: true, refreshCache: false, retryUntilAvailable: Boolean(site), ...options };
    if (config.useCache && !config.refreshCache && memoryCache.has(url)) return memoryCache.get(url);
    const key = `${url}|${config.retryUntilAvailable}|${config.useCache}|${config.refreshCache}`;
    if (!inFlight.has(key)) {
        const pending = performRequest(url, config, site).finally(() => inFlight.delete(key));
        inFlight.set(key, pending);
    }
    return inFlight.get(key);
}

export function clearCache() {
    memoryCache.clear();
}
