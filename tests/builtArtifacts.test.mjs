import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

test("built ExcelJS loads and saves the real checklist workbook with dynamic code generation disabled", async () => {
    const source = await readFile(new URL("../dist/lib/exceljs.min.js", import.meta.url), "utf8");
    assert.doesNotMatch(source, /new Function\(/);
    const template = await readFile(new URL("../dist/assets/RP_Checklist_2.6.1_encoded.txt", import.meta.url), "utf8");
    const context = vm.createContext({ setTimeout, clearTimeout, console, TextEncoder, TextDecoder,
        atob: value => Buffer.from(value, "base64").toString("binary"), template: template.trim() },
        { codeGeneration: { strings: false, wasm: false } });
    vm.runInContext(source, context);
    const bytes = vm.runInContext("Uint8Array.from(atob(template), c => c.charCodeAt(0))", context);
    const workbook = new context.ExcelJS.Workbook();
    await workbook.xlsx.load(bytes);
    assert.ok(workbook.worksheets.length > 0);
    workbook.worksheets[0].getCell("C4").value = "Test ASA";
    const saved = await workbook.xlsx.writeBuffer();
    assert.ok(saved.byteLength > 0);
    const reloaded = new context.ExcelJS.Workbook();
    await reloaded.xlsx.load(saved);
    assert.equal(reloaded.worksheets[0].getCell("C4").value, "Test ASA");
});

test("internal checklist data is packaged but not exposed to arbitrary websites", async () => {
    const manifest = JSON.parse(await readFile(new URL("../dist/manifest.json", import.meta.url), "utf8"));
    assert.ok(manifest.web_accessible_resources.every(resource => !resource.matches.includes("<all_urls>")));
    assert.ok(manifest.web_accessible_resources.every(resource => !resource.resources.some(file => file.includes("encoded.txt"))));
    assert.equal(manifest.web_accessible_resources[0].resources.includes("popup.html"), true);
});
