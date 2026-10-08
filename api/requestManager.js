const memoryCache = new Map();
const inFlight = new Map();
const trackedTabs = new Map();
const tabCreations = new Map();
const requestControllers = new Set();
const recoveryState = new Map();
let cacheGeneration = 0;

export const SITE_RETRY_INTERVAL_MS = 10000;
const REQUEST_TIMEOUT_MS = 10000;
const TAB_RECOVERY_COOLDOWN_MS = 60000;
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

export function cancelPendingRequests() {
    for (const controller of requestControllers) controller.abort();
    clearCache();
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
        // A navigating/discarded page can leave executeScript's callback unresolved.
        const timer = setTimeout(() => reject(requestError("Browser/page operation timed out")), REQUEST_TIMEOUT_MS);
        try {
            method(...args, result => {
                clearTimeout(timer);
                const error = chrome.runtime.lastError;
                if (error) reject(requestError(error.message));
                else resolve(result);
            });
        } catch (error) {
            clearTimeout(timer);
            reject(requestError(error.message));
        }
    });
}

async function siteTabs(site) {
    const tabs = await chromeCall(chrome.tabs.query.bind(chrome.tabs), { url: `${site.origin}/*` });
    const candidates = tabs.filter(tab => tab.id);
    if (trackedTabs.has(site.id)) {
        try {
            const tab = await chromeCall(chrome.tabs.get.bind(chrome.tabs), trackedTabs.get(site.id));
            if (tab?.id && !candidates.some(item => item.id === tab.id)) candidates.push(tab);
        } catch {
            trackedTabs.delete(site.id);
        }
    }
    return candidates.sort((a, b) => {
        const score = tab => Number(tab.url?.startsWith(site.origin + "/") && tab.status === "complete" && !tab.discarded) * 4 +
            Number(tab.id === trackedTabs.get(site.id)) * 2 + Number(Boolean(tab.active));
        return score(b) - score(a);
    });
}

async function openSiteTab(site) {
    if (!tabCreations.has(site.id)) {
        tabCreations.set(site.id, chromeCall(chrome.tabs.create.bind(chrome.tabs), { url: `${site.origin}/` })
            .then(tab => {
                trackedTabs.set(site.id, tab.id);
                recoveryState.set(site.id, { failures: 0, lastOpenedAt: Date.now() });
                return tab;
            })
            .finally(() => tabCreations.delete(site.id)));
    }
    return tabCreations.get(site.id);
}

async function findTrustedPageTab(site) {
    const tabs = await siteTabs(site);
    return tabs[0] || openSiteTab(site);
}

export async function ensureSiteTab(siteId) {
    const site = Object.values(SITES).find(item => item.id === siteId);
    if (!site) throw requestError("Unknown prerequisite website", 0, false);
    return findTrustedPageTab(site);
}

async function recoverSite(site, responsiveTab = false) {
    const tabs = await siteTabs(site);
    if (!tabs.length) return openSiteTab(site);
    const state = recoveryState.get(site.id) || { failures: 0, lastOpenedAt: Date.now() };
    state.failures++;
    recoveryState.set(site.id, state);
    // A live Cairo survey is already the correct session context. Retrying an API
    // failure must not open another Cairo tab or disturb that assessment page.
    if (site.id === "cairo" && responsiveTab && tabs.some(tab => tab.status === "complete" && !tab.discarded &&
        tab.url?.startsWith(site.origin + "/") && !/\/(?:login|logon|signin|sign-in|wsso)(?:\/|[?#]|$)/i.test(new URL(tab.url).pathname))) return;
    // Do not navigate a user's survey or repeatedly interrupt a live SSO flow.
    if (state.failures >= 3 && Date.now() - state.lastOpenedAt >= TAB_RECOVERY_COOLDOWN_MS) {
        return openSiteTab(site);
    }
}

async function fetchFromTab(url, site, tab, probe = false) {
    if (typeof chrome === "undefined" || !chrome.scripting || !chrome.tabs) {
        throw requestError(`${site.label} requests require the browser scripting permission.`, 0, false);
    }
    if (tab.status !== "complete" || !tab.url?.startsWith(site.origin + "/")) {
        throw requestError(`${site.label} is waiting for sign-in.`);
    }
    const results = await chromeCall(chrome.scripting.executeScript.bind(chrome.scripting), {
        target: { tabId: tab.id }, world: "MAIN",
        args: [url, Boolean(site.bearer), site.origin, REQUEST_TIMEOUT_MS, probe],
        func: async (requestUrl, useBearerToken, pageOrigin, timeout, sessionProbe) => {
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
                const token = useBearerToken ? normalizeToken(localStorage.getItem("esatsToken") || sessionStorage.getItem("esatsToken")) : null;
                if (useBearerToken && !token) return { ok: false, status: 401, message: "Waiting for an ESATS bearer token" };
                const requestOptions = {
                    method: "GET",
                    headers: { Accept: "application/json, text/plain, */*", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                    credentials: useBearerToken ? "omit" : "include",
                    cache: "no-store", referrer: pageOrigin + "/",
                    referrerPolicy: "strict-origin-when-cross-origin",
                    signal: AbortSignal.timeout(timeout)
                };
                let response;
                try { response = await fetch(requestUrl, requestOptions); }
                catch (error) {
                    // Some public Termbank endpoints allow CORS without cookies only.
                    if (!useBearerToken && new URL(requestUrl).origin !== pageOrigin && error.name === "TypeError") {
                        response = await fetch(requestUrl, { ...requestOptions, credentials: "omit" });
                    } else throw error;
                }
                if (!response.ok && !(sessionProbe && response.status === 404)) return { ok: false, status: response.status, message: `HTTP ${response.status}` };
                if (new URL(response.url || requestUrl).hostname !== new URL(requestUrl).hostname) {
                    return { ok: false, status: 401, message: "Redirected to sign-in" };
                }
                const text = await response.text();
                if (sessionProbe) {
                    const finalPath = new URL(response.url || requestUrl).pathname;
                    if (/\/(?:login|logon|signin|sign-in|wsso)(?:\/|$)/i.test(finalPath) ||
                        /<title[^>]*>[^<]*(?:sign[ -]?in|log[ -]?in|sign[ -]?on)/i.test(text) ||
                        /<form[^>]*action=["'][^"']*(?:login|logon|signin|sign-in)/i.test(text)) {
                        return { ok: false, status: 401, message: "Waiting for sign-in" };
                    }
                    return { ok: true, data: { sessionActive: true } };
                }
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
        throw Object.assign(requestError(`${site.label}: ${result?.message || "No data response"}`, result?.status || 0, isRetryableStatus(result?.status)), { pageResponded: Boolean(result) });
    }
    return result.data;
}

async function fetchTrustedJson(url, site, signal, probe = false, allowTabRecovery = true) {
    let tabs = await siteTabs(site);
    if (!tabs.length) {
        if (!allowTabRecovery) throw requestError(`${site.label} is not open.`, 0, false);
        tabs = [await openSiteTab(site)];
    }
    let failure;
    let responsiveTab = false;
    for (const tab of tabs) {
        if (signal?.aborted || recoveryHandlers.shouldCancel?.()) throw requestError("Request cancelled by user", 0, false);
        try {
            const data = await fetchFromTab(url, site, tab, probe);
            if (signal?.aborted) throw requestError("Request cancelled by user", 0, false);
            const status = Number(data?.statusCode || data?.status);
            if (status >= 400) throw requestError(`HTTP ${status}`, status, isRetryableStatus(status));
            trackedTabs.set(site.id, tab.id);
            const state = recoveryState.get(site.id);
            if (state) state.failures = 0;
            return data;
        } catch (error) {
            if (error.retryable === false) throw error;
            responsiveTab ||= error.pageResponded === true;
            failure = error;
        }
    }
    if (allowTabRecovery) await recoverSite(site, responsiveTab);
    throw failure || requestError(`${site.label} is waiting for sign-in.`);
}

export async function probeSiteSession(siteId, url) {
    const site = Object.values(SITES).find(item => item.id === siteId);
    if (!site || new URL(url).protocol !== "https:" || ![site.origin, ...Object.entries(SITES)
        .filter(([, item]) => item.id === siteId).map(([host]) => `https://${host}`)].includes(new URL(url).origin)) {
        throw requestError("Invalid session probe", 0, false);
    }
    return fetchJson(url, { sessionProbe: true, useCache: false, retries: 1, retryUntilAvailable: false });
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

async function performRequest(url, config, site, signal) {
    let attempt = 0;
    while (true) {
        if (signal.aborted || config.shouldCancel?.() || recoveryHandlers.shouldCancel?.()) throw requestError("Request cancelled by user", 0, false);
        attempt++;
        try {
            let data;
            if (config.sessionProbe || (site && !site.direct)) {
                data = await fetchTrustedJson(
                    url,
                    site,
                    signal,
                    config.sessionProbe,
                    config.allowTabRecovery !== false
                );
            }
            else {
                try { data = await fetchDirectJson(url); }
                catch (error) {
                    if (!site || error.retryable === false || signal.aborted) throw error;
                    // Cairo cookies may only be available in the website context.
                    data = await fetchTrustedJson(
                        url,
                        site,
                        signal,
                        false,
                        config.allowTabRecovery !== false
                    );
                }
            }
            if (signal.aborted) throw requestError("Request cancelled by user", 0, false);
            const status = Number(data?.statusCode || data?.status);
            if (status >= 400) throw requestError(`HTTP ${status}`, status, isRetryableStatus(status));
            const normalized = unwrapApiResponse(data);
            if (config.useCache && config.cacheGeneration === cacheGeneration) memoryCache.set(url, normalized);
            return normalized;
        } catch (error) {
            if (signal.aborted) throw requestError("Request cancelled by user", 0, false);
            const keepWaiting = site && config.retryUntilAvailable && error.retryable !== false;
            if (!keepWaiting && (error.retryable === false || attempt >= config.retries)) throw error;
            if (keepWaiting) {
                // Status/UI failures must not stop the actual data recovery loop.
                try { await recoveryHandlers.onRetry?.({ siteId: site.id, siteName: site.label, attempt,
                    retryInMs: SITE_RETRY_INTERVAL_MS, error: error.message }); } catch { /* Keep retrying the endpoint. */ }
            }
            await sleep(site ? SITE_RETRY_INTERVAL_MS : config.retryDelay);
        }
    }
}

export async function fetchJson(url, options = {}) {
    const hostname = new URL(url).hostname;
    const site = SITES[hostname] || Object.values(SITES).find(item => new URL(item.origin).hostname === hostname);
    const config = { retries: 3, retryDelay: 1000, useCache: true, refreshCache: false, retryUntilAvailable: Boolean(site), ...options, cacheGeneration };
    if (config.useCache && !config.refreshCache && memoryCache.has(url)) return memoryCache.get(url);
    const key = `${url}|${config.retryUntilAvailable}|${config.useCache}|${config.refreshCache}|${Boolean(config.sessionProbe)}`;
    if (!inFlight.has(key)) {
        const controller = new AbortController();
        requestControllers.add(controller);
        let onAbort;
        const cancelled = new Promise((resolve, reject) => {
            onAbort = () => reject(requestError("Request cancelled by user", 0, false));
            controller.signal.addEventListener("abort", onAbort, { once: true });
        });
        const pending = Promise.race([performRequest(url, config, site, controller.signal), cancelled]).finally(() => {
            controller.signal.removeEventListener("abort", onAbort);
            requestControllers.delete(controller);
            if (inFlight.get(key) === pending) inFlight.delete(key);
        });
        inFlight.set(key, pending);
    }
    return inFlight.get(key);
}

export function clearCache() {
    cacheGeneration++;
    memoryCache.clear();
    inFlight.clear();
}
