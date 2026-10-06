import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { CONFIG, REVIEW_MODES } from "../utils/constants.js";

const assessment = { assessmentId: 11, assetId: 1, assetName: "Test app" };
const flush = () => new Promise(resolve => setImmediate(resolve));

async function harness(mode) {
    const context = vm.createContext({ CONFIG, REVIEW_MODES,
        REVIEW_SEMANTIC_OPTION_MATCH_QUESTION_IDS: [], REVIEW_SEMANTIC_OPTION_MATCH_THRESHOLD: 0.8,
        buildContext: async () => ({ application: assessment }),
        runValidation: async () => ({ assessmentId: 11, results: [] }) });
    const file = mode === "validation" ? "batchValidator.js" : "reviewEngine.js";
    const source = await readFile(new URL(`../core/${file}`, import.meta.url), "utf8");
    vm.runInContext(source.replace(/import\s+[\s\S]*?\sfrom\s*["'][^"']+["'];/g, "").replace(/^export /gm, ""), context);
    if (mode === "review") {
        context.loadReviewSurveyTemplates = async () => [];
        context.buildReviewResult = async () => ({ assessmentId: 11, workQueue: [] });
    }
    const run = callback => mode === "review"
        ? context.reviewBatch([assessment], {}, callback, () => false)
        : context.validateBatch([assessment], callback, () => false);
    return { context, run };
}

for (const mode of ["validation", "review"]) {
    test(`${mode} waits for asynchronous progress storage before reporting completion`, async () => {
        const h = await harness(mode);
        let release;
        let finished = false;
        const pending = h.run(async progress => {
            assert.equal(progress.completed, 1);
            await new Promise(resolve => { release = resolve; });
        }).then(result => { finished = true; return result; });
        await flush();
        assert.equal(finished, false);
        release();
        assert.equal((await pending).length, 1);
    });

    test(`${mode} progress failures propagate once without double-counting the assessment`, async () => {
        const h = await harness(mode);
        const completed = [];
        await assert.rejects(h.run(async progress => {
            completed.push(progress.completed);
            throw new Error("Storage unavailable");
        }), /Storage unavailable/);
        assert.deepEqual(completed, [1]);
    });
}
