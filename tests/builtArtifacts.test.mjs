import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile, stat } from "node:fs/promises";

test("built ExcelJS loads and saves the real checklist workbook with dynamic code generation disabled", async () => {
    const source = await readFile(new URL("../dist/chromium/lib/exceljs.min.js", import.meta.url), "utf8");
    assert.doesNotMatch(source, /new Function\(/);
    const template = await readFile(new URL("../dist/chromium/assets/RP_Checklist_2.6.1_encoded.txt", import.meta.url), "utf8");
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
    const manifest = JSON.parse(await readFile(new URL("../dist/chromium/manifest.json", import.meta.url), "utf8"));
    assert.ok(manifest.web_accessible_resources.every(resource => !resource.matches.includes("<all_urls>")));
    assert.ok(manifest.web_accessible_resources.every(resource => !resource.resources.some(file => file.includes("encoded.txt"))));
    assert.equal(manifest.web_accessible_resources[0].resources.includes("popup.html"), true);
});

test("built manifests use the correct Chromium and Firefox platform contracts", async () => {
    const chromium = JSON.parse(await readFile(new URL("../dist/chromium/manifest.json", import.meta.url), "utf8"));
    const firefox = JSON.parse(await readFile(new URL("../dist/firefox/manifest.json", import.meta.url), "utf8"));

    assert.equal(chromium.background.service_worker, "service_worker.bundle.js");
    assert.equal(chromium.side_panel.default_path, "popup.html?view=side-pane");
    assert.ok(chromium.permissions.includes("sidePanel"));
    assert.equal(chromium.browser_specific_settings, undefined);

    assert.deepEqual(firefox.background.scripts, ["service_worker.bundle.js"]);
    assert.equal(firefox.background.service_worker, undefined);
    assert.equal(firefox.sidebar_action.default_panel, "popup.html?view=side-pane");
    assert.ok(!firefox.permissions.includes("sidePanel"));
    assert.ok(firefox.permissions.includes("clipboardWrite"));
    assert.equal(firefox.browser_specific_settings.gecko.strict_min_version, "140.0");
    assert.equal(firefox.browser_specific_settings.gecko_android.strict_min_version, "142.0");
});

test("both platform bundles prefer the Firefox browser namespace when available", async () => {
    for (const platform of ["chromium", "firefox"]) {
        for (const file of ["popup.bundle.js", "service_worker.bundle.js", "cairoSurvey.bundle.js"]) {
            const source = await readFile(new URL(`../dist/${platform}/${file}`, import.meta.url), "utf8");
            assert.match(source, /^const chrome=globalThis\.browser\?\?globalThis\.chrome;/, `${platform}/${file}`);
        }
    }
});

test("build emits Chromium ZIP plus Firefox ZIP and XPI packages for the manifest version", async () => {
    const manifest = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url), "utf8"));
    const artifacts = [
        `../dist/risk-profiler-chromium-${manifest.version}.zip`,
        `../dist/risk-profiler-firefox-${manifest.version}.zip`,
        `../dist/risk-profiler-firefox-${manifest.version}.xpi`
    ];
    for (const artifact of artifacts) assert.ok((await stat(new URL(artifact, import.meta.url))).size > 0, artifact);
});
