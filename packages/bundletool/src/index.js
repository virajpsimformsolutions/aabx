import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { tmpdir } from "node:os";
import extractZip from "extract-zip";
const BUNDLETOOL_RELEASES_ENDPOINT = "https://api.github.com/repos/google/bundletool/releases";
export async function ensureBundletool(version) {
    const resolvedVersion = await resolveBundletoolVersion(version);
    const cacheDir = getCacheDirForVersion(resolvedVersion);
    const jarPath = path.join(cacheDir, "bundletool.jar");
    const metadataPath = path.join(cacheDir, "metadata.json");
    await fs.mkdir(cacheDir, { recursive: true });
    if (await fileExists(jarPath)) {
        await ensureMetadata(jarPath, metadataPath, resolvedVersion);
        return jarPath;
    }
    const release = await fetchReleaseByVersion(resolvedVersion);
    const jarUrl = getJarDownloadUrl(release);
    const jarBuffer = await downloadBinary(jarUrl);
    await fs.writeFile(jarPath, jarBuffer);
    const checksumSha256 = hashSha256(jarBuffer);
    const metadata = {
        version: resolvedVersion,
        checksumSha256,
        downloadedAt: new Date().toISOString(),
    };
    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    return jarPath;
}
export async function resolveBundletoolVersion(version) {
    if (version === "latest") {
        const response = await fetch(`${BUNDLETOOL_RELEASES_ENDPOINT}/latest`, {
            headers: {
                Accept: "application/vnd.github+json",
            },
        });
        if (!response.ok) {
            throw new Error(`Unable to resolve latest BundleTool version: HTTP ${response.status}`);
        }
        const latestRelease = (await response.json());
        return latestRelease.tag_name.trim();
    }
    return version.trim();
}
export function getBundletoolCacheRoot() {
    const fromEnv = process.env.AABX_CACHE_DIR;
    if (fromEnv && fromEnv.trim().length > 0) {
        return path.resolve(fromEnv, "bundletool");
    }
    return path.join(homedir(), ".aabx", "cache", "bundletool");
}
function getCacheDirForVersion(version) {
    return path.join(getBundletoolCacheRoot(), version);
}
function normalizeVersionTag(version) {
    const trimmed = version.trim();
    if (trimmed.startsWith("v")) {
        return trimmed;
    }
    return `v${trimmed}`;
}
async function ensureMetadata(jarPath, metadataPath, version) {
    if (await fileExists(metadataPath)) {
        return;
    }
    const jarBuffer = await fs.readFile(jarPath);
    const metadata = {
        version,
        checksumSha256: hashSha256(jarBuffer),
        downloadedAt: new Date().toISOString(),
    };
    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}
async function fetchReleaseByVersion(version) {
    const candidates = new Set([version, normalizeVersionTag(version)]);
    let lastStatus = 0;
    for (const tag of candidates) {
        const response = await fetch(`${BUNDLETOOL_RELEASES_ENDPOINT}/tags/${tag}`, {
            headers: {
                Accept: "application/vnd.github+json",
            },
        });
        if (response.ok) {
            return (await response.json());
        }
        lastStatus = response.status;
    }
    throw new Error(`Unable to fetch BundleTool release ${version}: HTTP ${lastStatus}`);
}
function getJarDownloadUrl(release) {
    const asset = release.assets.find((item) => item.name.endsWith(".jar"));
    if (!asset) {
        throw new Error(`BundleTool release ${release.tag_name} does not contain a .jar asset`);
    }
    return asset.browser_download_url;
}
async function downloadBinary(url) {
    const response = await fetch(url, {
        headers: {
            Accept: "application/octet-stream",
        },
    });
    if (!response.ok) {
        throw new Error(`Unable to download BundleTool jar: HTTP ${response.status}`);
    }
    const binary = await response.arrayBuffer();
    return Buffer.from(binary);
}
function hashSha256(content) {
    return createHash("sha256").update(content).digest("hex");
}
async function fileExists(filePath) {
    try {
        await fs.access(filePath);
        return true;
    }
    catch {
        return false;
    }
}
export async function buildUniversalApks(aabPath, outApksPath, javaBin, bundletoolJar, options = {}) {
    const resolvedAabPath = path.resolve(aabPath);
    const resolvedApksPath = path.resolve(outApksPath);
    const resolvedJarPath = path.resolve(bundletoolJar);
    await assertFileExists(resolvedAabPath, `Input AAB not found: ${resolvedAabPath}`);
    await assertFileExists(resolvedJarPath, `BundleTool jar not found: ${resolvedJarPath}`);
    await fs.mkdir(path.dirname(resolvedApksPath), { recursive: true });
    const args = [
        "-jar",
        resolvedJarPath,
        "build-apks",
        `--bundle=${resolvedAabPath}`,
        `--output=${resolvedApksPath}`,
        `--mode=${options.mode ?? "universal"}`,
        "--overwrite",
    ];
    if (options.signing) {
        const resolvedKeystorePath = path.resolve(options.signing.keystorePath);
        await assertFileExists(resolvedKeystorePath, `Keystore file not found: ${resolvedKeystorePath}`);
        args.push(`--ks=${resolvedKeystorePath}`, `--ks-pass=pass:${options.signing.keystorePassword}`, `--ks-key-alias=${options.signing.keyAlias}`, `--key-pass=pass:${options.signing.keyPassword}`);
    }
    await runCommand(javaBin, args);
}
export async function extractUniversalApk(apksPath, outputDir, outputFileName = "universal.apk") {
    const resolvedApksPath = path.resolve(apksPath);
    const resolvedOutputDir = path.resolve(outputDir);
    await assertFileExists(resolvedApksPath, `APKS archive not found: ${resolvedApksPath}`);
    await fs.mkdir(resolvedOutputDir, { recursive: true });
    const workDir = await fs.mkdtemp(path.join(tmpdir(), "aabx-apks-"));
    try {
        await extractZip(resolvedApksPath, { dir: workDir });
        const universalApkSource = await findFileByName(workDir, "universal.apk");
        if (!universalApkSource) {
            throw new Error("universal.apk was not found in APKS archive");
        }
        const safeFileName = outputFileName.toLowerCase().endsWith(".apk")
            ? outputFileName
            : `${outputFileName}.apk`;
        const universalApkOutPath = path.join(resolvedOutputDir, safeFileName);
        await fs.copyFile(universalApkSource, universalApkOutPath);
        return universalApkOutPath;
    }
    finally {
        await fs.rm(workDir, { recursive: true, force: true });
    }
}
async function assertFileExists(filePath, message) {
    const exists = await fileExists(filePath);
    if (!exists) {
        throw new Error(message);
    }
}
async function findFileByName(rootDir, fileName) {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(rootDir, entry.name);
        if (entry.isFile() && entry.name === fileName) {
            return fullPath;
        }
        if (entry.isDirectory()) {
            const nested = await findFileByName(fullPath, fileName);
            if (nested) {
                return nested;
            }
        }
    }
    return null;
}
async function runCommand(command, args) {
    await new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stderr = "";
        let stdout = "";
        child.stdout.on("data", (chunk) => {
            stdout += chunk.toString("utf8");
        });
        child.stderr.on("data", (chunk) => {
            stderr += chunk.toString("utf8");
        });
        child.on("error", (error) => {
            reject(error);
        });
        child.on("close", (code) => {
            if (code !== 0) {
                reject(new Error(`Command failed (${code}): ${command} ${args.join(" ")}\n${stderr || stdout}`));
                return;
            }
            resolve();
        });
    });
}
//# sourceMappingURL=index.js.map