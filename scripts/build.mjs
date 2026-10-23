import { build, transform } from "esbuild";
import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { deflateRawSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const distDir = path.join(rootDir, "dist");
const platformDirs = {
    chromium: path.join(distDir, "chromium"),
    firefox: path.join(distDir, "firefox")
};
const API_NAMESPACE_BANNER = "const chrome=globalThis.browser??globalThis.chrome;";

function resolveFromRoot(...segments) {
    return path.join(rootDir, ...segments);
}

function resolveFromPlatform(platform, ...segments) {
    return path.join(platformDirs[platform], ...segments);
}

async function cleanDist() {
    const resolvedDist = path.resolve(distDir);
    if (resolvedDist === rootDir || !resolvedDist.startsWith(`${rootDir}${path.sep}`)) {
        throw new Error(`Refusing to clean unexpected path: ${resolvedDist}`);
    }
    await rm(resolvedDist, { recursive: true, force: true });
    await Promise.all(Object.values(platformDirs).map(directory => mkdir(directory, { recursive: true })));
}

async function bundleScripts(platform) {
    const target = platform === "firefox" ? "firefox128" : "chrome120";
    const commonOptions = {
        bundle: true,
        minify: true,
        sourcemap: false,
        legalComments: "none",
        target,
        logLevel: "info",
        banner: { js: API_NAMESPACE_BANNER }
    };

    await Promise.all([
        build({
            ...commonOptions,
            entryPoints: [resolveFromRoot("popup.js")],
            outfile: resolveFromPlatform(platform, "popup.bundle.js"),
            format: "esm"
        }),
        build({
            ...commonOptions,
            entryPoints: [resolveFromRoot("service_worker.js")],
            outfile: resolveFromPlatform(platform, "service_worker.bundle.js"),
            format: "esm"
        }),
        build({
            ...commonOptions,
            entryPoints: [resolveFromRoot("content", "cairoSurvey.js")],
            outfile: resolveFromPlatform(platform, "cairoSurvey.bundle.js"),
            format: "iife"
        })
    ]);
}

async function copyStaticFiles(platform) {
    const outputDir = platformDirs[platform];
    const css = await readFile(resolveFromRoot("popup.css"), "utf8");
    const minifiedCss = await transform(css, {
        loader: "css",
        minify: true,
        legalComments: "none"
    });
    await writeFile(path.join(outputDir, "popup.css"), minifiedCss.code, "utf8");
    await cp(resolveFromRoot("lib"), path.join(outputDir, "lib"), { recursive: true });

    // ExcelJS bundles setImmediate's obsolete string-callback fallback. MV3
    // cannot compile string callbacks; retain function callbacks without eval.
    const excelPath = path.join(outputDir, "lib", "exceljs.min.js");
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
    const cspSafeExcel = excelSource
        .replace(stringCallback, 'if("function"!=typeof e)throw new TypeError("setImmediate requires a function callback");')
        .replaceAll(globalFallback, "globalThis")
        .replace(runtimeFallback, "(globalThis.regeneratorRuntime=n)");
    await writeFile(excelPath, cspSafeExcel, "utf8");
    await cp(resolveFromRoot("assets"), path.join(outputDir, "assets"), { recursive: true });
}

function compactHtml(html) {
    return html
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/>\s+</g, "><")
        .replace(/\s{2,}/g, " ")
        .trim();
}

async function writePopupHtml(platform) {
    const source = await readFile(resolveFromRoot("popup.html"), "utf8");
    const updated = source.replace(
        /<script\s+type="module"\s+src="popup\.js">\s*<\/script>/,
        '<script type="module" src="popup.bundle.js"></script>'
    );
    if (updated === source) throw new Error("Unable to rewrite popup script reference.");
    await writeFile(resolveFromPlatform(platform, "popup.html"), compactHtml(updated), "utf8");
}

function builtManifest(sourceManifest, platform) {
    const manifest = structuredClone(sourceManifest);
    manifest.content_scripts = manifest.content_scripts.map(script => ({
        ...script,
        js: script.js.map(file => file === "content/cairoSurvey.js" ? "cairoSurvey.bundle.js" : file)
    }));

    if (platform === "firefox") {
        manifest.permissions = manifest.permissions.filter(permission => permission !== "sidePanel");
        if (!manifest.permissions.includes("clipboardWrite")) manifest.permissions.push("clipboardWrite");
        manifest.background = {
            scripts: ["service_worker.bundle.js"],
            type: "module"
        };
        delete manifest.side_panel;
        manifest.sidebar_action = {
            default_title: manifest.action.default_title,
            default_panel: "popup.html?view=side-pane",
            open_at_install: false
        };
        manifest.browser_specific_settings = {
            gecko: {
                id: "risk-profiler-review-validator@boeing.com",
                strict_min_version: "140.0",
                data_collection_permissions: {
                    required: ["none"]
                }
            }
        };
        manifest.browser_specific_settings.gecko_android = {
            strict_min_version: "142.0"
        };
    } else {
        manifest.background = {
            service_worker: "service_worker.bundle.js",
            type: "module"
        };
    }
    return manifest;
}

async function writeManifest(platform, sourceManifest) {
    const manifest = builtManifest(sourceManifest, platform);
    await writeFile(
        resolveFromPlatform(platform, "manifest.json"),
        `${JSON.stringify(manifest, null, 2)}\n`,
        "utf8"
    );
}

const crcTable = Array.from({ length: 256 }, (_, value) => {
    let crc = value;
    for (let bit = 0; bit < 8; bit++) crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1);
    return crc >>> 0;
});

function crc32(buffer) {
    let crc = 0xffffffff;
    for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

async function packageFiles(directory, relative = "") {
    const entries = await readdir(path.join(directory, relative), { withFileTypes: true });
    const files = [];
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        const next = path.join(relative, entry.name);
        if (entry.isDirectory()) files.push(...await packageFiles(directory, next));
        else if (entry.isFile()) files.push(next);
    }
    return files;
}

async function createZip(sourceDir, outputFile) {
    const localParts = [];
    const centralParts = [];
    let offset = 0;
    for (const relativePath of await packageFiles(sourceDir)) {
        const name = Buffer.from(relativePath.split(path.sep).join("/"), "utf8");
        const data = await readFile(path.join(sourceDir, relativePath));
        const compressed = deflateRawSync(data, { level: 9 });
        const crc = crc32(data);
        const local = Buffer.alloc(30);
        local.writeUInt32LE(0x04034b50, 0);
        local.writeUInt16LE(20, 4);
        local.writeUInt16LE(0x0800, 6);
        local.writeUInt16LE(8, 8);
        local.writeUInt32LE(crc, 14);
        local.writeUInt32LE(compressed.length, 18);
        local.writeUInt32LE(data.length, 22);
        local.writeUInt16LE(name.length, 26);
        localParts.push(local, name, compressed);

        const central = Buffer.alloc(46);
        central.writeUInt32LE(0x02014b50, 0);
        central.writeUInt16LE(20, 4);
        central.writeUInt16LE(20, 6);
        central.writeUInt16LE(0x0800, 8);
        central.writeUInt16LE(8, 10);
        central.writeUInt32LE(crc, 16);
        central.writeUInt32LE(compressed.length, 20);
        central.writeUInt32LE(data.length, 24);
        central.writeUInt16LE(name.length, 28);
        central.writeUInt32LE(offset, 42);
        centralParts.push(central, name);
        offset += local.length + name.length + compressed.length;
    }

    const centralDirectory = Buffer.concat(centralParts);
    const end = Buffer.alloc(22);
    const entryCount = centralParts.length / 2;
    end.writeUInt32LE(0x06054b50, 0);
    end.writeUInt16LE(entryCount, 8);
    end.writeUInt16LE(entryCount, 10);
    end.writeUInt32LE(centralDirectory.length, 12);
    end.writeUInt32LE(offset, 16);
    await writeFile(outputFile, Buffer.concat([...localParts, centralDirectory, end]));
}

async function main() {
    await cleanDist();
    const sourceManifest = JSON.parse(await readFile(resolveFromRoot("manifest.json"), "utf8"));
    await Promise.all(Object.keys(platformDirs).map(async platform => {
        await bundleScripts(platform);
        await copyStaticFiles(platform);
        await writePopupHtml(platform);
        await writeManifest(platform, sourceManifest);
    }));

    const version = sourceManifest.version;
    await createZip(platformDirs.chromium, path.join(distDir, `risk-profiler-chromium-${version}.zip`));
    await createZip(platformDirs.firefox, path.join(distDir, `risk-profiler-firefox-${version}.zip`));
    await createZip(platformDirs.firefox, path.join(distDir, `risk-profiler-firefox-${version}.xpi`));
    console.log(`Built Chromium and Firefox packages in ${distDir}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
