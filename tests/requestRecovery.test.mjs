import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const cairoUrl = "https://cairois.web.boeing.com/api/assessment/1/detail";
const esatsUrl = "https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/versions?id=1";
const gtcUrl = "https://termbank.web.boeing.com/ses/v1.2/GlobalTradeControlVocabularies/name/test.json";
const gtcPrerequisiteUrl = "https://termbank.web.boeing.com/ses/v1.2/GlobalTradeControlVocabularies/name/0A002.json";
const esatsOrigin = "https://esats.web.boeing.com";
const gtcOrigin = "https://gtc-ecm.web.boeing.com";
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };

test("Cairo retries API failures in an existing survey tab without opening duplicates", async () => {
    const h = await harness();
    const tab = h.addTab("https://cairois.web.boeing.com");
    tab.url += "Assessments/41559874/Survey/616901";
    h.replies.set(cairoUrl, [{ status: 401 }]);
    const pending = h.context.fetchJson(cairoUrl);
    const outcome = pending.catch(error => error);
    await flush();
    for (let attempt = 0; attempt < 8; attempt++) await h.tick();
    assert.equal(h.creations.length, 0);
    h.replies.set(cairoUrl, [{ status: 200, data: { ready: true } }]);
    await h.tick();
    assert.equal((await outcome).ready, true);
    assert.equal(h.creations.length, 0);
});

test("passive Cairo requests fail without opening or recovering a tab", async () => {
    const h = await harness();
    h.replies.set(cairoUrl, [{ error: new TypeError("offline") }]);
    await assert.rejects(
        h.context.fetchJson(cairoUrl, {
            retryUntilAvailable: false,
            retries: 1,
            allowTabRecovery: false
        }),
        /offline/
    );
    assert.equal(h.creations.length, 0);
});

async function harness({ promiseBrowser = false } = {}) {
    const tabs = new Map();
    const timers = [];
    const requests = [];
    const creations = [];
    const tokens = new Map();
    const tabTokens = new Map();
    const sessionTokens = new Map();
    const brokenTabs = new Set();
    const logs = { info: [], warn: [], error: [] };
    const sessionStorageArea = {
        values: {},
        async get(key) { return { [key]: this.values[key] }; },
        async set(values) { Object.assign(this.values, values); },
        async remove(key) { delete this.values[key]; }
    };
    const clock = { now: Date.now() };
    let nextId = 1;
    const replies = new Map();
    const fetch = async (url, options) => {
        requests.push({ url, options });
        const queue = replies.get(url) || [];
        const configured = queue.length > 1 ? queue.shift() : queue[0] || { status: 200, data: { data: url } };
        const reply = typeof configured === "function" ? configured(options) : configured;
        if (reply.error) throw reply.error;
        return { ok: reply.status >= 200 && reply.status < 300, status: reply.status,
            url: reply.finalUrl || url, statusText: "test",
            json: async () => { if (reply.html) throw new SyntaxError("Not JSON"); return reply.data; },
            text: async () => typeof reply.html === "string" ? reply.html : reply.html ? "<html>Sign in</html>" : JSON.stringify(reply.data) };
    };
    const chrome = {
        runtime: {},
        storage: { session: sessionStorageArea },
        tabs: {
            query(query, callback) {
                const result = [...tabs.values()].filter(tab => tab.url.startsWith(query.url.slice(0, -1)));
                if (promiseBrowser) return Promise.resolve(result);
                callback(result);
            },
            get(id, callback) {
                if (promiseBrowser) return tabs.has(id) ? Promise.resolve(tabs.get(id)) : Promise.reject(new Error("Tab closed"));
                if (!tabs.has(id)) { chrome.runtime.lastError = { message: "Tab closed" }; callback(); delete chrome.runtime.lastError; }
                else callback(tabs.get(id));
            },
            create(options, callback) {
                const tab = { id: nextId++, url: options.url, status: "loading" };
                tabs.set(tab.id, tab);
                creations.push(tab);
                if (promiseBrowser) return Promise.resolve(tab);
                callback(tab);
            }
        },
        scripting: {
            executeScript(details, callback) {
                const tab = tabs.get(details.target.tabId);
                if (brokenTabs.has(tab.id)) return;
                // Exercise the actual injected function in a page-like context.
                const fn = vm.runInNewContext(`(${details.func.toString()})`, {
                    URL, AbortSignal, location: { origin: new URL(tab.url).origin },
                    fetch: (url, options) => fetch(url, { ...options, tabId: tab.id }),
                    localStorage: { getItem: () => tabTokens.get(tab.id) ?? tokens.get(new URL(tab.url).origin) ?? null },
                    sessionStorage: { getItem: () => sessionTokens.get(tab.id) || null }
                });
                const result = Promise.resolve(fn(...(details.args || []))).then(value => [{ result: value }]);
                if (promiseBrowser) return result;
                result.then(callback);
            }
        }
    };
    const deterministicMath = Object.create(Math);
    deterministicMath.random = () => 0.5;
    const context = vm.createContext({ URL, AbortSignal, AbortController, chrome,
        browser: promiseBrowser ? chrome : undefined, fetch,
        Math: deterministicMath,
        console: {
            info: (...args) => logs.info.push(args),
            warn: (...args) => logs.warn.push(args),
            error: (...args) => logs.error.push(args)
        },
        Date: class extends Date { static now() { return clock.now; } },
        setTimeout: (callback, ms) => { const timer = { callback, ms }; timers.push(timer); return timer; },
        clearTimeout: timer => { const index = timers.indexOf(timer); if (index !== -1) timers.splice(index, 1); } });
    const source = await readFile(new URL("../api/requestManager.js", import.meta.url), "utf8");
    vm.runInContext(source.replace(/^export /gm, ""), context);
    const addTab = (origin, status = "complete") => {
        const tab = { id: nextId++, url: origin + "/", status };
        tabs.set(tab.id, tab);
        return tab;
    };
    const tick = async () => {
        await flush();
        assert.ok(timers.length, "a retry should be scheduled");
        const timer = timers.shift();
        clock.now += timer.ms;
        timer.callback();
        await flush();
        return timer.ms;
    };
    return { context, tabs, tokens, tabTokens, sessionTokens, brokenTabs, clock, timers, requests, creations, replies, addTab, tick, sessionStorageArea, logs };
}

test("Firefox promise-based browser APIs use the shared request and injection path", async () => {
    const h = await harness({ promiseBrowser: true });
    const tab = h.addTab("https://cairois.web.boeing.com");
    tab.url += "Assessments/41559874/Survey/616901";
    h.replies.set(cairoUrl, [{ status: 200, data: { ready: true } }]);

    assert.deepEqual(await h.context.fetchJson(cairoUrl), { ready: true });
    assert.equal(h.creations.length, 0);
});

test("Cairo retries progress through 2, 5 and 10 seconds while other sites retain ten seconds", async () => {
    const h = await harness();
    h.replies.set(cairoUrl, [{ status: 503 }, { status: 503 }, { status: 503 }, { status: 200, data: { ready: true } }]);
    const cairo = h.context.fetchJson(cairoUrl);
    await flush();
    assert.equal(await h.tick(), 2000);
    assert.equal(await h.tick(), 5000);
    assert.equal(await h.tick(), 10000);
    assert.equal((await cairo).ready, true);

    h.replies.set(gtcUrl, [{ status: 503 }, { status: 200, data: { ready: true } }]);
    const gtc = h.context.fetchJson(gtcUrl, { refreshCache: true });
    await flush();
    assert.equal(await h.tick(), 10000);
    assert.equal((await gtc).ready, true);
});

test("default request logs are concise and diagnostic while debug logs include each request", async () => {
    const h = await harness();
    h.replies.set(cairoUrl, [{ status: 503 }, { status: 200, data: { ready: true } }]);
    const pending = h.context.fetchJson(cairoUrl);
    await flush();
    await h.tick();
    await pending;

    assert.equal(h.logs.info.some(([message]) => /Trying a direct/.test(message)), false);
    const retry = h.logs.warn.find(([message]) => /retry scheduled/.test(message));
    const recovered = h.logs.info.find(([message]) => /recovered successfully/.test(message));
    for (const entry of [retry, recovered]) {
        assert.ok(entry);
        assert.match(entry[1].requestId, /^request-/);
        assert.equal(Number.isFinite(entry[1].attempt), true);
        assert.equal(Number.isFinite(entry[1].durationMs), true);
        assert.equal(entry[1].url, undefined);
        assert.match(entry[1].endpoint, /assessment\/\{id\}\/detail$/);
    }

    h.context.setRequestRecoveryHandlers({ isDebug: () => true });
    await h.context.fetchJson(gtcUrl, { refreshCache: true });
    const debugStart = h.logs.info.find(([message]) => /Trying a direct extension request/.test(message));
    assert.ok(debugStart);
    assert.equal(debugStart[1].url, gtcUrl);
    assert.match(debugStart[1].requestId, /^request-/);
});

test("missing ESATS retries only ESATS while Cairo and GTC results are retained", async () => {
    const h = await harness();
    h.addTab(gtcOrigin);
    const pending = Promise.all([h.context.fetchJson(cairoUrl), h.context.fetchJson(esatsUrl), h.context.fetchJson(gtcUrl)]);
    await flush();
    assert.equal(h.creations.length, 1);
    assert.equal(h.creations[0].url, esatsOrigin + "/");
    const signOnTab = h.creations[0];
    signOnTab.status = "complete";
    signOnTab.url = "https://wsso.example/login";
    await h.tick();
    assert.equal(h.creations.length, 1, "keep the tracked login tab through redirects");
    signOnTab.url = esatsOrigin + "/";
    await h.tick();
    assert.equal(h.requests.filter(request => request.url === esatsUrl).length, 0, "do not send an unauthenticated ESATS fetch");
    h.tokens.set(esatsOrigin, JSON.stringify({ access_token: "test-token" }));
    await h.tick();
    const results = await pending;
    assert.equal(results.length, 3);
    assert.equal(h.requests.filter(request => request.url === cairoUrl).length, 1);
    assert.equal(h.requests.filter(request => request.url === gtcUrl).length, 1);
    assert.equal(h.requests.filter(request => request.url === esatsUrl).length, 1);
    assert.equal(h.requests.find(request => request.url === esatsUrl).options.headers.Authorization, "Bearer test-token");
});

test("ESATS retries with a refreshed token after direct bearer and tab fallback failures", async () => {
    const h = await harness();
    h.addTab(esatsOrigin);
    h.tokens.set(esatsOrigin, "expired-token");
    h.replies.set(esatsUrl, [{ status: 401 }, { status: 401 }, { status: 200, data: { statusCode: 200, data: ["ready"] } }]);
    const pending = h.context.fetchJson(esatsUrl);
    await flush();
    h.tokens.set(esatsOrigin, "Bearer refreshed-token");
    await h.tick();
    assert.deepEqual(Array.from(await pending), ["ready"]);
    assert.equal(h.requests.length, 3);
    assert.equal(h.requests.at(-1).options.headers.Authorization, "Bearer refreshed-token");
    assert.equal(h.creations.length, 0);
});

test("a failing GTC endpoint retries without refetching a successful GTC endpoint", async () => {
    const h = await harness();
    h.addTab(gtcOrigin);
    const missingUrl = gtcUrl.replace("test.json", "other.json");
    h.replies.set(missingUrl, [{ status: 503 }, { status: 200, data: ["ready"] }]);
    const pending = Promise.all([h.context.fetchJson(gtcUrl), h.context.fetchJson(missingUrl)]);
    await flush();
    await h.tick();
    await pending;
    assert.equal(h.requests.filter(request => request.url === gtcUrl).length, 1);
    assert.equal(h.requests.filter(request => request.url === missingUrl).length, 2);
});

test("Cairo login HTML is retried directly without opening Cairo", async () => {
    const h = await harness();
    h.replies.set(cairoUrl, [{ status: 200, html: true }, { status: 200, data: { surveyTemplateId: 123 } }]);
    const pending = h.context.fetchJson(cairoUrl);
    await flush();
    assert.equal(h.creations.length, 0);
    await h.tick();
    assert.equal((await pending).surveyTemplateId, 123);
    assert.equal(h.requests.length, 2);
    assert.equal(h.requests.every(request => request.options.credentials === "include"), true);
});

test("a one-shot readiness probe does not enter the indefinite retry loop", async () => {
    const h = await harness();
    h.addTab(esatsOrigin);
    await assert.rejects(h.context.fetchJson(esatsUrl, { retries: 1, retryUntilAvailable: false }), /bearer token/);
    assert.equal(h.timers.length, 0);
});

test("cancel stops a waiting data request at the next retry", async () => {
    const h = await harness();
    h.addTab(esatsOrigin);
    let cancelled = false;
    h.context.setRequestRecoveryHandlers({ shouldCancel: () => cancelled });
    const pending = h.context.fetchJson(esatsUrl);
    const rejection = assert.rejects(pending, /cancelled/);
    await flush();
    cancelled = true;
    await h.tick();
    await rejection;
    assert.equal(h.requests.length, 0);
    assert.equal(h.timers.length, 0);
});

test("permanent missing-record errors do not loop forever", async () => {
    const h = await harness();
    h.replies.set(cairoUrl, [{ status: 404 }]);
    await assert.rejects(h.context.fetchJson(cairoUrl), /404/);
    assert.equal(h.requests.length, 1);
    assert.equal(h.timers.length, 0);
});

test("readiness refreshes stale cache but the subsequent data load reuses the fresh result", async () => {
    const h = await harness();
    h.addTab(esatsOrigin);
    h.tokens.set(esatsOrigin, "test-token");
    h.replies.set(esatsUrl, [{ status: 200, data: { version: "old" } }, { status: 200, data: { version: "new" } }]);
    assert.equal((await h.context.fetchJson(esatsUrl)).version, "old");
    assert.equal((await h.context.fetchJson(esatsUrl, { refreshCache: true, retryUntilAvailable: false, retries: 1 })).version, "new");
    assert.equal((await h.context.fetchJson(esatsUrl)).version, "new");
    assert.equal(h.requests.length, 2);
});

test("a prerequisite-created tab is reused even while it is on the login redirect", async () => {
    const h = await harness();
    const tab = h.addTab("https://wsso.example");
    h.context.rememberSiteTab("esats", tab.id);
    const pending = h.context.fetchJson(esatsUrl);
    await flush();
    assert.equal(h.creations.length, 0);
    tab.url = esatsOrigin + "/";
    h.tokens.set(esatsOrigin, "test-token");
    await h.tick();
    await pending;
    assert.equal(h.creations.length, 0);
});

test("identical concurrent requests share one recovery loop", async () => {
    const h = await harness();
    h.addTab(esatsOrigin);
    const pending = Promise.all([h.context.fetchJson(esatsUrl), h.context.fetchJson(esatsUrl)]);
    await flush();
    assert.equal(h.timers.length, 1);
    h.tokens.set(esatsOrigin, "test-token");
    await h.tick();
    await pending;
    assert.equal(h.requests.length, 1);
});

test("force cancellation rejects immediately without waiting for the retry timer", async () => {
    const h = await harness();
    h.addTab(esatsOrigin);
    const old = h.context.fetchJson(esatsUrl);
    const stopped = assert.rejects(old, /cancelled/);
    await flush();
    h.context.cancelPendingRequests();
    await stopped;
    h.tokens.set(esatsOrigin, "test-token");
    await h.context.fetchJson(esatsUrl);
    const count = h.requests.length;
    await h.tick();
    assert.equal(h.requests.length, count, "old retry timers cannot issue another request");
});

test("late cancelled responses cannot repopulate cache or overwrite a new request", async () => {
    const h = await harness();
    let releaseOld;
    h.context.fetch = async () => new Promise(resolve => { releaseOld = resolve; });
    const old = h.context.fetchJson(cairoUrl);
    const stopped = assert.rejects(old, /cancelled/);
    await flush();
    h.context.cancelPendingRequests();
    h.context.fetch = async () => ({ ok: true, url: cairoUrl, json: async () => ({ version: "new" }) });
    assert.equal((await h.context.fetchJson(cairoUrl)).version, "new");
    await stopped;
    releaseOld({ ok: true, url: cairoUrl, json: async () => ({ version: "old" }) });
    await flush();
    assert.equal((await h.context.fetchJson(cairoUrl)).version, "new");
});

test("ESATS switches from an expired-token tab, caches the working token, then goes direct", async () => {
    const h = await harness();
    const expired = h.addTab(esatsOrigin);
    const working = h.addTab(esatsOrigin);
    h.tabTokens.set(expired.id, "expired");
    h.tabTokens.set(working.id, "valid");
    h.replies.set(esatsUrl, [options => options.headers.Authorization === "Bearer valid"
        ? { status: 200, data: { ready: true } } : { status: 401 }]);
    assert.equal((await h.context.fetchJson(esatsUrl)).ready, true);
    assert.deepEqual(h.requests.map(request => request.options.tabId), [undefined, expired.id, working.id]);
    await h.context.fetchJson(esatsUrl, { refreshCache: true });
    assert.equal(h.requests.at(-1).options.tabId, undefined);
    assert.equal(h.requests.at(-1).options.headers.Authorization, "Bearer valid");
    assert.equal(h.timers.length, 0);
});

test("ESATS uses a browser-session cached token directly when no ESATS tab is open", async () => {
    const h = await harness();
    h.sessionStorageArea.values.riskProfilerEsatsBearerToken = "cached-token";
    h.replies.set(esatsUrl, [{ status: 200, data: { ready: true } }]);
    assert.equal((await h.context.fetchJson(esatsUrl)).ready, true);
    assert.equal(h.creations.length, 0);
    assert.equal(h.requests.at(-1).options.tabId, undefined);
    assert.equal(h.requests.at(-1).options.headers.Authorization, "Bearer cached-token");
});

test("GTC ignores website tabs and requests its API directly without cookies", async () => {
    const h = await harness();
    h.replies.set(gtcUrl, [{ status: 200, data: { ready: true } }]);
    assert.equal((await h.context.fetchJson(gtcUrl)).ready, true);
    assert.equal(h.requests.at(-1).options.tabId, undefined);
    assert.equal(h.requests.at(-1).options.credentials, "omit");
    assert.equal(h.creations.length, 0);
});

test("GTC prerequisite checks a real known ECCN through the same direct API route", async () => {
    const h = await harness();
    h.replies.set(gtcPrerequisiteUrl, [{ status: 200, data: { terms: [{ term: { name: "0A002" } }] } }]);
    const result = await h.context.probeDirectEndpoint("gtc", gtcPrerequisiteUrl);
    assert.equal(result.reachable, true);
    assert.equal(result.status, 200);
    assert.equal(h.requests.at(-1).options.credentials, "omit");
    assert.equal(h.creations.length, 0);
});

test("GTC direct requests use a longer timeout than Cairo and ESATS", async () => {
    const source = await readFile(new URL("../api/requestManager.js", import.meta.url), "utf8");
    assert.match(source, /const GTC_REQUEST_TIMEOUT_MS = 30000/);
    assert.match(source, /site\?\.id === "gtc" \? GTC_REQUEST_TIMEOUT_MS : REQUEST_TIMEOUT_MS/);
});

test("Cairo never falls back to website tabs when a direct request fails", async () => {
    const h = await harness();
    const bad = h.addTab("https://cairois.web.boeing.com");
    const good = h.addTab("https://cairois.web.boeing.com");
    h.replies.set(cairoUrl, [{ status: 200, html: true }]);
    await assert.rejects(h.context.fetchJson(cairoUrl, { retryUntilAvailable: false, retries: 1 }), /did not return JSON/);
    assert.deepEqual(h.requests.map(request => request.options.tabId), [undefined]);
    assert.equal(h.creations.length, 0);
    assert.equal(h.timers.length, 0);
});

for (const [siteId, origin, url] of [["esats", esatsOrigin, esatsUrl]]) {
    test(`${siteId}: an unresponsive injection times out, then a working alternative supplies the data`, async () => {
        const h = await harness();
        const broken = h.addTab(origin);
        const good = h.addTab(origin);
        h.brokenTabs.add(broken.id);
        h.tokens.set(esatsOrigin, "valid");
        const pending = h.context.fetchJson(url);
        await flush();
        await h.tick();
        assert.equal((await pending).ready ?? true, true);
        assert.equal(h.requests.at(-1).options.tabId, undefined);
        assert.equal(h.requests.at(-1).options.headers.Authorization, "Bearer valid");
        assert.equal(h.creations.length, 0);
    });

    test(`${siteId}: closed tabs are reopened and retries resume after sign-in`, async () => {
        const h = await harness();
        const pending = h.context.fetchJson(url);
        await flush();
        assert.equal(h.creations.length, 1);
        h.tabs.delete(h.creations[0].id);
        await h.tick();
        assert.equal(h.creations.length, 2);
        h.creations[1].status = "complete";
        h.tokens.set(esatsOrigin, "valid");
        await h.tick();
        await pending;
        assert.equal(h.requests.at(-1).options.tabId, undefined);
        assert.equal(h.requests.at(-1).options.headers.Authorization, "Bearer valid");
    });
}

test("a stuck sign-on tab is retried then replaced without creating a tab every ten seconds", async () => {
    const h = await harness();
    const login = h.addTab("https://wsso.example");
    h.context.rememberSiteTab("esats", login.id);
    const pending = h.context.fetchJson(esatsUrl);
    await flush();
    for (let i = 0; i < 5; i++) await h.tick();
    assert.equal(h.creations.length, 0, "give the current SSO flow time to finish");
    await h.tick();
    assert.equal(h.creations.length, 1);
    h.creations[0].status = "complete";
    h.tokens.set(esatsOrigin, "valid");
    await h.tick();
    await pending;
    assert.equal(h.creations.length, 1);
});

test("ESATS also reads a token from the tab's session storage", async () => {
    const h = await harness();
    const tab = h.addTab(esatsOrigin);
    h.sessionTokens.set(tab.id, JSON.stringify({ esatsToken: "session-token" }));
    await h.context.fetchJson(esatsUrl);
    assert.equal(h.requests.at(-1).options.headers.Authorization, "Bearer session-token");
});

test("Termbank direct requests fail visibly without opening a GTC tab", async () => {
    const h = await harness();
    h.addTab(gtcOrigin);
    h.replies.set(gtcUrl, [{ error: new TypeError("CORS") }]);
    await assert.rejects(h.context.fetchJson(gtcUrl, { retryUntilAvailable: false, retries: 1 }), /CORS/);
    assert.deepEqual(h.requests.map(request => request.options.credentials), ["omit"]);
    assert.equal(h.creations.length, 0);
    assert.equal(h.timers.length, 0);
});

test("session probes switch tabs, reject sign-in HTML and preserve reachable GTC root 404 behavior", async () => {
    const h = await harness();
    const bad = h.addTab(gtcOrigin);
    const good = h.addTab(gtcOrigin);
    const url = "https://termbank.web.boeing.com/";
    h.replies.set(url, [options => options.tabId === bad.id
        ? { status: 200, html: "<html><title>Sign in</title></html>" } : { status: 404, data: { message: "No landing page" } }]);
    assert.equal((await h.context.probeSiteSession("gtc", url)).sessionActive, true);
    assert.equal(h.requests.at(-1).options.tabId, good.id);
    assert.equal(h.creations.length, 0);
});

test("ESATS session probes check the base website with cookies instead of a gateway bearer token", async () => {
    const h = await harness();
    h.addTab(esatsOrigin);
    const url = esatsOrigin + "/";
    h.replies.set(url, [{ status: 200, html: "<html><title>ESATS</title></html>" }]);
    assert.equal((await h.context.probeSiteSession("esats", url)).sessionActive, true);
    assert.equal(h.requests.at(-1).url, url);
    assert.equal(h.requests.at(-1).options.credentials, "include");
    assert.equal(h.requests.at(-1).options.headers.Authorization, undefined);
});

test("a session probe is force-cancellable even when the injected page never responds", async () => {
    const h = await harness();
    const tab = h.addTab(gtcOrigin);
    h.brokenTabs.add(tab.id);
    const pending = h.context.probeSiteSession("gtc", "https://termbank.web.boeing.com/");
    const stopped = assert.rejects(pending, /cancelled/);
    await flush();
    h.context.cancelPendingRequests();
    await stopped;
    await h.tick();
    assert.equal(h.requests.length, 0);
    assert.equal(h.creations.length, 0);
});

test("a failed progress notification does not stop data retries", async () => {
    const h = await harness();
    const tab = h.addTab(esatsOrigin);
    h.context.setRequestRecoveryHandlers({ onRetry: async () => { throw new Error("Progress unavailable"); } });
    const pending = h.context.fetchJson(esatsUrl);
    await flush();
    h.sessionTokens.set(tab.id, "valid");
    await h.tick();
    await pending;
    assert.equal(h.requests.length, 1);
});

test("a fresh run clears cached answers and does not join a previous run's pending request", async () => {
    const h = await harness();
    let release;
    h.context.fetch = async () => new Promise(resolve => { release = resolve; });
    const previous = h.context.fetchJson(cairoUrl);
    await flush();
    h.context.clearCache();
    h.context.fetch = async () => ({ ok: true, url: cairoUrl, json: async () => ({ version: "current" }) });
    assert.equal((await h.context.fetchJson(cairoUrl)).version, "current");
    release({ ok: true, url: cairoUrl, json: async () => ({ version: "previous" }) });
    assert.equal((await previous).version, "previous");
    assert.equal((await h.context.fetchJson(cairoUrl)).version, "current", "an old response cannot overwrite the fresh run cache");
    h.context.clearCache();
    h.context.fetch = async () => ({ ok: true, url: cairoUrl, json: async () => ({ version: "next" }) });
    assert.equal((await h.context.fetchJson(cairoUrl)).version, "next");
});
