import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

async function exporter() {
    const source = await readFile(new URL("../export/excelExporter.js", import.meta.url), "utf8");
    const context = vm.createContext({ chrome: { runtime: { getURL: file => file } } });
    vm.runInContext(source.replace(/import\s+[\s\S]*?\sfrom\s*["'][^"']+["'];/g, "").replace(/^export /gm, ""), context);
    return context;
}

test("Excel sheet names are unique, bounded and do not collide with workbook/template sheets", async () => {
    const h = await exporter();
    const used = new Set(["all assessments", "template"]);
    const names = ["All Assessments", "Template", "Example", "example", "a".repeat(40), "a".repeat(39) + "b", "[]:/?*", "'quoted'", "History"];
    for (const [index, assetName] of names.entries()) {
        const sheet = h.createSheetName({ assetName }, index, used);
        assert.ok(sheet.length > 0 && sheet.length <= 31);
        assert.doesNotMatch(sheet, /[\\/?*[\]:]/);
        assert.equal(sheet.startsWith("'") || sheet.endsWith("'"), false);
        assert.notEqual(sheet.toLowerCase(), "history");
        assert.equal(used.has(sheet.toLowerCase()), true, "the chosen name is reserved");
        assert.equal([...used].filter(value => value === sheet.toLowerCase()).length, 1);
    }
    assert.equal(used.size, names.length + 2, "every assessment receives a distinct sheet");
});
