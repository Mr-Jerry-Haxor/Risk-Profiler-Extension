import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import RP4 from "../checkpoints/RP4.js";
import RP7 from "../checkpoints/RP7.js";
import { URLS } from "../utils/constants.js";
import { replaceTokens } from "../utils/helpers.js";

const answer = (alternateQuestionId, ...values) => ({ alternateQuestionId,
    answerOptions: values.map(internalValue => ({ internalValue })) });
const artifact = (value, policyRuleId = 2) => ({ policyRuleId, artifactName: value });
const mapping = (group = "EARN") => ({ terms: [{ term: { displayName: "test",
    associated: [{ fields: [{ field: { name: group } }] }] } }] });
const context = (type = "SaaS", classification = "EAR-NLR", values = ["5D002.c.1"], records = [mapping()]) => ({
    answers: [answer("CSIR-AppType", type), answer("CSIR-CodeClassification", classification)],
    artifacts: values.map(value => artifact(value)), exportControl: records
});

async function lookupHarness(replies) {
    const calls = [];
    const sandbox = vm.createContext({ URLS, replaceTokens, encodeURIComponent,
        fetchJson: async url => {
            const code = decodeURIComponent(url.split("/name/")[1].slice(0, -5));
            calls.push(code);
            const response = replies[code];
            if (!response) throw Object.assign(new Error("HTTP 404"), { status: 404 });
            if (response instanceof Error) throw response;
            return response;
        }
    });
    const source = await readFile(new URL("../api/gtcApi.js", import.meta.url), "utf8");
    vm.runInContext(source.replace(/import\s+[\s\S]*?\sfrom\s*["'][^"']+["'];/g, "").replace(/^export /gm, ""), sandbox);
    return { calls, get: sandbox.getExportControlData };
}

test("RP4 is NA for SaaS regardless of device-count answer", async () => {
    for (const count of [null, "Not installed/deployed on any device", "100 devices"]) {
        const data = context();
        if (count) data.answers.push(answer("CSIR-DeviceCount", count));
        const result = await RP4.validate(data);
        assert.equal(result.status, "NA");
        assert.match(result.reason, /SaaS/);
    }
});

test("RP4 retains non-SaaS device-count pass/fail behavior", async () => {
    const data = context("Web application");
    data.answers.push(answer("CSIR-DeviceCount", "Not installed/deployed on any device"));
    assert.equal((await RP4.validate(data)).status, "FAIL");
    data.answers[data.answers.length - 1] = answer("CSIR-DeviceCount", "1-100 devices");
    assert.equal((await RP4.validate(data)).status, "PASS");
});

test("RP7 is NA for SaaS without an ESATS JCD, even when classification is unanswered", async () => {
    for (const classification of ["Not Subject to Export Controls", "EAR-LR", null]) {
        const result = await RP7.validate(context("SaaS", classification, [], []));
        assert.equal(result.status, "NA");
        assert.match(result.reason, /ESATS has no JCD/);
    }
});

test("RP7 ignores non-JCD artifacts and blank JCD values for SaaS applicability", async () => {
    const data = context("Software-as-a-Service", "EAR-LR", [], []);
    data.artifacts = [artifact("other", 1), artifact("   "), artifact(null)];
    assert.equal((await RP7.validate(data)).status, "NA");
});

test("RP7 requires SaaS classification to match its ESATS/GTC reference", async () => {
    assert.equal((await RP7.validate(context())).status, "PASS");
    assert.equal((await RP7.validate(context("SaaS", "EAR-LR"))).status, "FAIL");
    assert.equal((await RP7.validate(context("SaaS", "Not Subject to Export Controls"))).status, "FAIL");
    assert.equal((await RP7.validate(context("SaaS", null))).status, "FAIL");
    const nsr = { terms: [{ term: { displayName: "NSR" } }] };
    assert.equal((await RP7.validate(context("SaaS", "Not Subject to Export Controls", ["NSR"], [nsr]))).status, "PASS");
});

test("GTC uses an exact mapping without requesting parent codes", async () => {
    const h = await lookupHarness({ "5D002.c.1": mapping() });
    const records = await h.get([artifact("5D002.c.1")]);
    assert.deepEqual(h.calls, ["5D002.c.1"]);
    assert.equal(records[0].lookup.fallback, false);
    assert.equal(records[0].lookup.gtcValue, "5D002.c.1");
});

test("RP7 shows original ESATS JCD and the parent GTC reference on pass and fail", async () => {
    const h = await lookupHarness({ "5D002.c": mapping() });
    const records = await h.get([artifact("5D002.c.1")]);
    assert.deepEqual(h.calls, ["5D002.c.1", "5D002.c"]);
    assert.equal(records[0].lookup.fallback, true);
    for (const [classification, expected] of [["EAR-NLR", "PASS"], ["EAR-LR", "FAIL"]]) {
        const result = await RP7.validate(context("SaaS", classification, ["5D002.c.1"], records));
        assert.equal(result.status, expected);
        assert.match(result.reason, /ESATS JCD: 5D002\.c\.1/);
        assert.match(result.reason, /GTC reference: 5D002\.c \(parent-code fallback\)/);
        assert.match(result.reason, /Lookup attempts:.*5D002\.c\.1.*404.*5D002\.c: found/);
    }
});

test("GTC falls back through dotted parents after empty mappings", async () => {
    const h = await lookupHarness({ "5D002.c.1": { terms: [] }, "5D002.c": { terms: [] }, "5D002": mapping("EARL") });
    const records = await h.get([artifact("5D002.c.1")]);
    assert.deepEqual(h.calls, ["5D002.c.1", "5D002.c", "5D002"]);
    assert.equal(records[0].lookup.gtcValue, "5D002");
    assert.equal((await RP7.validate(context("Web application", "EAR-LR", ["5D002.c.1"], records))).status, "PASS");
});

test("unmapped JCD is FAIL with every attempted GTC code and error details", async () => {
    const h = await lookupHarness({});
    const records = await h.get([artifact("5D002.c.1")]);
    assert.deepEqual(h.calls, ["5D002.c.1", "5D002.c", "5D002"]);
    for (const type of ["SaaS", "Web application"]) {
        const result = await RP7.validate(context(type, "EAR-NLR", ["5D002.c.1"], records));
        assert.equal(result.status, "FAIL");
        assert.match(result.reason, /GTC reference: not found/);
        assert.match(result.reason, /5D002\.c\.1: error \(HTTP 404\)/);
        assert.match(result.reason, /5D002\.c: error \(HTTP 404\)/);
        assert.match(result.reason, /5D002: error \(HTTP 404\)/);
        assert.match(result.reason, /No GTC mapping was found/);
    }
});

test("non-missing errors do not select a parent mapping", async () => {
    const error = Object.assign(new Error("Request cancelled by user"), { status: 0 });
    const h = await lookupHarness({ "5D002.c.1": error, "5D002.c": mapping() });
    const records = await h.get([artifact("5D002.c.1")]);
    assert.deepEqual(h.calls, ["5D002.c.1"]);
    const result = await RP7.validate(context("SaaS", "EAR-NLR", ["5D002.c.1"], records));
    assert.equal(result.status, "FAIL");
    assert.match(result.reason, /Request cancelled by user/);
});

test("GTC deduplicates JCD values and handles string policy identifiers", async () => {
    const h = await lookupHarness({ "5D002.c.1": mapping() });
    const records = await h.get([artifact("5D002.c.1"), artifact(" 5D002.c.1 ", "2"), artifact("other", 3)]);
    assert.equal(records.length, 1);
    assert.deepEqual(h.calls, ["5D002.c.1"]);
});

test("one mapped JCD does not hide another missing mapping", async () => {
    const h = await lookupHarness({ "5D002.c": mapping() });
    const records = await h.get([artifact("5D002.c.1"), artifact("unmapped")]);
    const result = await RP7.validate(context("SaaS", "EAR-NLR", ["5D002.c.1", "unmapped"], records));
    assert.equal(result.status, "FAIL");
    assert.match(result.reason, /ESATS JCD: unmapped/);
});
