import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const cairoUrl = "https://cairois.web.boeing.com/api/assessment/1/detail";
const esatsUrl = "https://service-gateway.tas-phx.apps.boeing.com/gateway/asset/versions?id=1";
const gtcUrl = "https://termbank.web.boeing.com/ses/v1.2/GlobalTradeControlVocabularies/name/test.json";
const esatsOrigin = "https://esats.web.boeing.com";
const gtcOrigin = "https://gtc-ecm.web.boeing.com";
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };

async function harness() {
    const tabs = new Map();
    const timers = [];
    const requests = [];
    const creations = [];
    const tokens = new Map();
    let nextId = 1;
    const replies = new Map();
    const fetch = async (url, options) => {
        requests.push({ url, options });
        const queue = replies.get(url) || [];
        const reply = queue.length > 1 ? queue.shift() : queue[0] || { status: 200, data: { data: url } };
        if (reply.error) throw reply.error;
        return { ok: reply.status >= 200 && reply.status < 300, status: reply.status,
            url: reply.finalUrl || url, statusText: "test",
            json: async () => { if (reply.html) throw new SyntaxError("Not JSON"); return reply.data; },
            text: async () => reply.html ? "<html>Sign in</html>" : JSON.stringify(reply.data) };
    };
    const chrome = {
        runtime: {},
        tabs: {
            query(query, callback) { callback([...tabs.values()].filter(tab => tab.url.startsWith(query.url.slice(0, -1)))); },
            get(id, callback) {
                if (!tabs.has(id)) { chrome.runtime.lastError = { message: "Tab closed" }; callback(); delete chrome.runtime.lastError; }
                else callback(tabs.get(id));
            },
            create(options, callback) { const tab = { id: nextId++, url: options.url, status: "loading" }; tabs.set(tab.id, tab); creations.push(tab); callback(tab); }
        },
        scripting: {
            executeScript(details, callback) {
                const tab = tabs.get(details.target.tabId);
                // Exercise the actual injected function in a page-like context.
                const fn = vm.runInNewContext(`(${details.func.toString()})`, {
                    URL, AbortSignal, location: { origin: new URL(tab.url).origin }, fetch,
                    localStorage: { getItem: () => tokens.get(new URL(tab.url).origin) || null }
                });
                fn(...details.args).then(result => callback([{ result }]));
            }
        }
    };
    const context = vm.createContext({ URL, AbortSignal, chrome, fetch,
        setTimeout: (callback, ms) => { timers.push({ callback, ms }); } });
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
        assert.equal(timer.ms, 10000, "all site retries wait exactly ten seconds");
        timer.callback();
        await flush();
    };
    return { context, tabs, tokens, timers, requests, creations, replies, addTab, tick };
}

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

test("recovery keeps retrying past the old ten-minute limit and refreshes the token", async () => {
    const h = await harness();
    h.addTab(esatsOrigin);
    h.tokens.set(esatsOrigin, "expired-token");
    h.replies.set(esatsUrl, [...Array.from({ length: 65 }, () => ({ status: 401 })), { status: 200, data: { statusCode: 200, data: ["ready"] } }]);
    const pending = h.context.fetchJson(esatsUrl);
    await flush();
    for (let attempt = 0; attempt < 64; attempt++) await h.tick();
    h.tokens.set(esatsOrigin, "Bearer refreshed-token");
    await h.tick();
    assert.deepEqual(Array.from(await pending), ["ready"]);
    assert.equal(h.requests.length, 66);
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

test("Cairo login HTML is retried after opening Cairo rather than accepted as data", async () => {
    const h = await harness();
    h.replies.set(cairoUrl, [{ status: 200, html: true }, { status: 200, data: { surveyTemplateId: 123 } }]);
    const pending = h.context.fetchJson(cairoUrl);
    await flush();
    assert.equal(h.creations[0].url, "https://cairois.web.boeing.com/");
    await h.tick();
    assert.equal((await pending).surveyTemplateId, 123);
    assert.equal(h.requests.length, 2);
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
