import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import RP11 from "../checkpoints/RP11.js";
import { URLS } from "../utils/constants.js";
import { normalizeAnswersByAlternateQuestionId } from "../core/answerUtils.js";
import { extractAnswerValues, normalize } from "../checkpoints/helpers.js";

const withoutImports = source => source.replace(/import\s+[\s\S]*?\sfrom\s*["'][^"']+["'];/g, "");
const answer = (id, value, extra = {}) => ({ alternateQuestionId: id,
    answerOptions: value == null ? [] : [{ internalValue: value }], ...extra });
const row = { assetName: "Example App", incompleteAssessmentId: 22, lastAssessmentId: 11 };
const evidence = (value = "yes", source = "incomplete") => ({ status: "found", assetName: row.assetName,
    assessmentId: source === "incomplete" ? 22 : 11, source, serviceAccountAnswer: value });
const context = (acp, service = "No", type = "Standalone desktop", database = "No") => ({
    application: { assetName: row.assetName }, acp,
    answers: [answer("CSIR-AppType", type), answer("CSIR-Database", database), answer("CSIR-SvcAcct", service)]
});

async function acpHarness(rows = [row], answers = { answers: [answer("ACP-NPI1", "Yes")] }) {
    const calls = [];
    const sandbox = vm.createContext({ URLS, normalizeAnswersByAlternateQuestionId, extractAnswerValues, normalize,
        fetchJson: async url => { calls.push({ url }); if (rows instanceof Error) throw rows; return rows; },
        getAssessmentAnswers: async id => { calls.push({ assessmentId: id }); if (answers instanceof Error) throw answers; return answers; }
    });
    const source = await readFile(new URL("../api/acpApi.js", import.meta.url), "utf8");
    vm.runInContext(withoutImports(source).replace(/^export /gm, ""), sandbox);
    return { calls, get: sandbox.getAcpServiceAccountEvidence };
}

test("ACP uses the type-48 list, exactly matches names, and prefers an incomplete assessment", async () => {
    const h = await acpHarness({ data: [{ ...row, assetName: "Example App Extra" }, row] });
    const acp = await h.get(row.assetName);
    assert.equal(h.calls[0].url, "https://cairois.web.boeing.com/node-api/assets/4/82/assessment/type/48");
    assert.equal(h.calls[1].assessmentId, 22);
    assert.equal(acp.serviceAccountAnswer, "yes");
    assert.equal(acp.source, "incomplete");
    assert.equal((await RP11.validate(context(acp))).status, "FAIL");
});

test("ACP falls back to the last assessment only when no incomplete assessment exists", async () => {
    const h = await acpHarness([{ ...row, incompleteAssessmentId: null }]);
    const acp = await h.get(row.assetName);
    assert.equal(h.calls[1].assessmentId, 11);
    assert.equal(acp.source, "last");
    assert.match((await RP11.validate(context(acp))).reason, /last assessment 11.*ACP-NPI1 is Yes/);
});

test("ACP matching is case-sensitive and does not use partial or trimmed names", async () => {
    const h = await acpHarness();
    for (const name of ["Example", "example app", "Example App "]) {
        assert.equal((await h.get(name)).status, "no-match");
    }
    assert.equal(h.calls.some(call => call.assessmentId), false);
});

test("ACP chooses the latest identifier answer across uppercase and lowercase historical templates", async () => {
    const h = await acpHarness([row], { answers: [
        answer("ACP-NPI1", "Yes", { createdOn: "2025-01-01" }),
        answer("acp-npi1", "No", { createdOn: "2026-01-01" })
    ] });
    assert.equal((await h.get(row.assetName)).serviceAccountAnswer, "no");
});

test("missing ACP list entries or assessment IDs are explicit absence of ACP evidence", async () => {
    const missing = await acpHarness([]);
    assert.equal((await missing.get(row.assetName)).status, "no-match");
    const none = await acpHarness([{ assetName: row.assetName }]);
    assert.equal((await none.get(row.assetName)).status, "no-assessment");
    assert.equal(none.calls.length, 1);
});

test("ACP rejects ambiguous matches, malformed responses, missing answers, invalid IDs and HTTP failures", async () => {
    for (const [rows, answers] of [
        [[row, { ...row, lastAssessmentId: 33 }], []],
        [{ unexpected: true }, []],
        [[row], {}],
        [[row], { answers: [] }],
        [[row], { answers: [answer("ACP-NPI1", null)] }],
        [[row], { answers: [answer("ACP-NPI1", "Maybe")] }],
        [[{ ...row, incompleteAssessmentId: "invalid" }], []],
        [new Error("HTTP 403"), []],
        [[row], new Error("HTTP 404")]
    ]) {
        const h = await acpHarness(rows, answers);
        const acp = await h.get(row.assetName);
        assert.equal(acp.status, "error");
        assert.equal((await RP11.validate(context(acp, "Yes", "Web application"))).status, "FAIL");
    }
});

test("RP11 ACP Yes requires CSIR-SvcAcct Yes for all application types", async () => {
    assert.equal((await RP11.validate(context(evidence(), "Yes"))).status, "PASS");
    for (const service of ["No", "Not Applicable", null]) {
        const result = await RP11.validate(context(evidence(), service));
        assert.equal(result.status, "FAIL");
        assert.match(result.reason, /assessment 22.*ACP-NPI1 is Yes/);
    }
});

test("RP11 retains application-type and database rules after checking ACP No or absence", async () => {
    for (const acp of [evidence("no"), { status: "no-match", assetName: row.assetName },
        { status: "no-assessment", assetName: row.assetName }]) {
        assert.equal((await RP11.validate(context(acp))).status, "NA");
        assert.equal((await RP11.validate(context(acp, "No", "Web application"))).status, "FAIL");
        assert.equal((await RP11.validate(context(acp, "Yes", "Web application"))).status, "PASS");
        assert.equal((await RP11.validate(context(acp, "No", "Standalone desktop", "Yes"))).status, "FAIL");
        assert.equal((await RP11.validate(context(acp, "Yes", "Standalone desktop", "Yes"))).status, "PASS");
    }
});

test("RP11 cannot pass or return NA before ACP evidence has been checked", async () => {
    for (const acp of [undefined, { status: "error", error: "ACP lookup unavailable" },
        { ...evidence(), serviceAccountAnswer: undefined }]) {
        for (const type of ["Standalone desktop", "Web application"]) {
            const result = await RP11.validate(context(acp, "Yes", type));
            assert.equal(result.status, "FAIL");
            assert.match(result.reason, /Unable to verify ACP/);
        }
    }
});

test("RP11 is not skipped by the engine before ACP validation when RP survey questions are missing", async () => {
    const sandbox = vm.createContext({ CHECKPOINTS: [RP11], questionExists: () => false,
        calculateScore: () => ({}), console });
    const source = await readFile(new URL("../core/validationEngine.js", import.meta.url), "utf8");
    vm.runInContext(withoutImports(source).replace(/^export /gm, ""), sandbox);
    const data = context(evidence());
    data.answers = [];
    const result = await sandbox.runValidation(data);
    assert.equal(result.results[0].status, "FAIL");
    assert.match(result.results[0].reason, /ACP-NPI1 is Yes/);
});

test("validation context includes ACP evidence fetched for the current exact asset name", async () => {
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    const names = [];
    const sandbox = vm.createContext({ getAssessmentContext: async () => ({ answers: [], detail: {} }),
        getReviewSummary: async () => ({}), getAllArtifacts: async () => ({ artifacts: [], versions: [] }),
        getBusinessApplicationContactDetailsSummary: async () => [], getAsaName: () => "",
        getExportControlData: async () => [],
        getAcpServiceAccountEvidence: async name => { names.push(name); return pending; } });
    const source = await readFile(new URL("../core/contextBuilder.js", import.meta.url), "utf8");
    vm.runInContext(withoutImports(source).replace(/^export /gm, ""), sandbox);
    let completed = false;
    const result = sandbox.buildContext({ assetName: row.assetName, assessmentId: 99 }).then(value => { completed = true; return value; });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(completed, false, "context waits for ACP before validation starts");
    release(evidence());
    assert.equal((await result).acp.assessmentId, 22);
    assert.deepEqual(names, [row.assetName]);
});
