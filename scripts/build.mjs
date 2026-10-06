import { build, transform } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir =
    path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        ".."
    );

const distDir =
    path.join(rootDir, "dist");

function resolveFromRoot(...segments) {
    return path.join(rootDir, ...segments);
}

function resolveFromDist(...segments) {
    return path.join(distDir, ...segments);
}

async function cleanDist() {
    const resolvedDist =
        path.resolve(distDir);

    if (
        resolvedDist === rootDir ||
        !resolvedDist.startsWith(`${rootDir}${path.sep}`)
    ) {
        throw new Error(`Refusing to clean unexpected path: ${resolvedDist}`);
    }

    await rm(
        resolvedDist,
        {
            recursive:
                true,
            force:
                true
        }
    );

    await mkdir(
        resolvedDist,
        {
            recursive:
                true
        }
    );
}

async function bundleScripts() {
    const commonOptions = {
        bundle:
            true,
        minify:
            true,
        sourcemap:
            false,
        legalComments:
            "none",
        target:
            "chrome120",
        logLevel:
            "info"
    };

    await build({
        ...commonOptions,
        entryPoints: [
            resolveFromRoot("popup.js")
        ],
        outfile:
            resolveFromDist("popup.bundle.js"),
        format:
            "esm"
    });

    await build({
        ...commonOptions,
        entryPoints: [
            resolveFromRoot("service_worker.js")
        ],
        outfile:
            resolveFromDist("service_worker.bundle.js"),
        format:
            "esm"
    });
}

async function bundleCairoContentScript() {
    await build({
        entryPoints: [resolveFromRoot("content", "cairoSurvey.js")],
        outfile: resolveFromDist("cairoSurvey.bundle.js"),
        bundle: true,
        minify: true,
        legalComments: "none",
        target: "chrome120",
        format: "iife"
    });
}

async function copyStaticFiles() {
    const css =
        await readFile(
            resolveFromRoot("popup.css"),
            "utf8"
        );

    const minifiedCss =
        await transform(
            css,
            {
                loader:
                    "css",
                minify:
                    true,
                legalComments:
                    "none"
            }
        );

    await writeFile(
        resolveFromDist("popup.css"),
        minifiedCss.code,
        "utf8"
    );

    await cp(
        resolveFromRoot("lib"),
        resolveFromDist("lib"),
        {
            recursive:
                true
        }
    );

    // ExcelJS bundles setImmediate's obsolete string-callback fallback. MV3
    // cannot compile string callbacks; retain function callbacks without eval.
    const excelPath = resolveFromDist("lib", "exceljs.min.js");
    const excelSource = await readFile(excelPath, "utf8");
    const stringCallback = '"function"!=typeof e&&(e=new Function(""+e));';
    if (excelSource.split(stringCallback).length !== 2) {
        throw new Error("ExcelJS CSP compatibility guard changed; review the vendor bundle before building.");
    }
    const globalFallback = 'Function("return this")()';
    const runtimeFallback = 'Function("r","regeneratorRuntime = r")(n)';
    if (excelSource.split(globalFallback).length !== 7 || excelSource.split(runtimeFallback).length !== 2) {
        throw new Error("ExcelJS global/runtime compatibility guards changed; review the vendor bundle before building.");
    }
    const cspSafeExcel = excelSource.replace(stringCallback,
        'if("function"!=typeof e)throw new TypeError("setImmediate requires a function callback");')
        .replaceAll(globalFallback, "globalThis")
        .replace(runtimeFallback, "(globalThis.regeneratorRuntime=n)");
    await writeFile(excelPath, cspSafeExcel, "utf8");

    await cp(
        resolveFromRoot("assets"),
        resolveFromDist("assets"),
        {
            recursive:
                true
        }
    );
}

function compactHtml(
    html
) {

    return html
        .replace(
            /<!--[\s\S]*?-->/g,
            ""
        )
        .replace(
            />\s+</g,
            "><"
        )
        .replace(
            /\s{2,}/g,
            " "
        )
        .trim();
}

async function writePopupHtml() {
    const source =
        await readFile(
            resolveFromRoot("popup.html"),
            "utf8"
        );

    const updated =
        source.replace(
            /<script\s+type="module"\s+src="popup\.js">\s*<\/script>/,
            '<script type="module" src="popup.bundle.js"></script>'
        );

    if (updated === source) {
        throw new Error("Unable to rewrite popup script reference.");
    }

    await writeFile(
        resolveFromDist("popup.html"),
        compactHtml(updated),
        "utf8"
    );
}

async function writeManifest() {
    const source =
        await readFile(
            resolveFromRoot("manifest.json"),
            "utf8"
        );

    const manifest =
        JSON.parse(source);

    manifest.background = {
        ...manifest.background,
        service_worker:
            "service_worker.bundle.js",
        type:
            "module"
    };

    manifest.content_scripts = manifest.content_scripts.map(script => ({
        ...script,
        js: script.js.map(file => file === "content/cairoSurvey.js" ? "cairoSurvey.bundle.js" : file)
    }));

    await writeFile(
        resolveFromDist("manifest.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8"
    );
}

async function main() {
    await cleanDist();
    await bundleScripts();
    await bundleCairoContentScript();
    await copyStaticFiles();
    await writePopupHtml();
    await writeManifest();

    console.log("Built extension package in dist/");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
