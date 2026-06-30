import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { installApk, listDevices } from "../../../../packages/adb/src/index.js";
import { detectJava } from "../../../../packages/android/src/index.js";
import {
    buildUniversalApks,
    ensureBundletool,
    extractUniversalApk,
    type SigningConfig,
} from "../../../../packages/bundletool/src/index.js";
import { loadConfig } from "../../../../packages/config/src/index.js";
import { runChecks } from "../../../../packages/doctor/src/index.js";
import { createLogger } from "../../../../packages/logger/src/index.js";
import type { CommonCommandOptions } from "./types.js";

function reportStub(command: string, details: Record<string, unknown>, options?: CommonCommandOptions): void {
  const config = loadConfig();
  const logger = createLogger({ debug: Boolean(options?.debug) });

  logger.info(`${command} is scaffolded and ready for implementation.`);
  logger.info(`Config output directory: ${config.output}`);
  logger.debug("Command details", details);
}

export async function handleInit(options: CommonCommandOptions): Promise<void> {
  reportStub("init", {}, options);
}

export async function handleDoctor(options: CommonCommandOptions & { json?: boolean }): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ debug: Boolean(options.debug) });
  const checks = await runChecks({ outputDir: config.output });

  if (options.json) {
    process.stdout.write(`${JSON.stringify(checks, null, 2)}\n`);
  } else {
    for (const check of checks) {
      const status = check.ok ? "PASS" : check.severity === "critical" ? "FAIL" : "WARN";
      logger.info(`[${status}] ${check.name}: ${check.message}`);
      if (check.fix && !check.ok) {
        logger.info(`  Fix: ${check.fix}`);
      }
    }
  }

  const hasCriticalFailure = checks.some((check) => !check.ok && check.severity === "critical");
  if (hasCriticalFailure) {
    throw new Error("Doctor detected critical environment issues.");
  }
}

type ApkType = "universal" | "signed";
type PartialSigningConfig = Partial<SigningConfig>;

type BuildPipelineOptions = {
  output: string;
  bundletoolVersion: string;
  clean: boolean;
  debug?: boolean;
  apkType?: string;
  keystore?: string;
  keystorePass?: string;
  keyAlias?: string;
  keyPass?: string;
  signingJson?: string;
};

function isBlank(value: string | undefined): boolean {
  return !value || value.trim().length === 0;
}

async function promptVisible(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    return (await rl.question(question)).trim();
  } finally {
    rl.close();
  }
}

async function promptHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error("Cannot prompt for secret values in non-interactive mode.");
  }

  const stdin = process.stdin;
  const stdout = process.stdout;
  const canToggleRawMode = typeof stdin.setRawMode === "function";
  const wasRaw = canToggleRawMode ? Boolean(stdin.isRaw) : false;

  return await new Promise<string>((resolve, reject) => {
    let value = "";

    const cleanup = () => {
      stdin.removeListener("data", onData);
      if (canToggleRawMode) {
        stdin.setRawMode(wasRaw);
      }
      stdin.pause();
    };

    const onData = (chunk: Buffer | string) => {
      const key = chunk.toString("utf8");

      if (key === "\r" || key === "\n") {
        stdout.write("\n");
        cleanup();
        resolve(value);
        return;
      }

      if (key === "\u0003") {
        stdout.write("\n");
        cleanup();
        reject(new Error("Prompt cancelled by user."));
        return;
      }

      if (key === "\u007f" || key === "\b") {
        if (value.length > 0) {
          value = value.slice(0, -1);
        }
        return;
      }

      value += key;
    };

    stdout.write(question);
    if (canToggleRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.on("data", onData);
  });
}

function normalizeApkType(value: string | undefined): ApkType | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "universal" || normalized === "1") {
    return "universal";
  }
  if (normalized === "signed" || normalized === "2") {
    return "signed";
  }

  return null;
}

async function resolveApkType(apkType?: string): Promise<ApkType> {
  const parsed = normalizeApkType(apkType);
  if (parsed) {
    return parsed;
  }

  if (apkType) {
    throw new Error(`Invalid --apk-type value: ${apkType}. Use universal/signed or 1/2.`);
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return "universal";
  }

  const answer = await promptVisible("Choose APK type: 1) universal  2) signed [1]: ");
  const chosen = normalizeApkType(answer.length === 0 ? "1" : answer);
  if (!chosen) {
    throw new Error("Invalid APK type selection. Use 1 or 2.");
  }

  return chosen;
}

function parseSigningJson(raw: string): PartialSigningConfig {
  const parsed = JSON.parse(raw) as Record<string, unknown>;

  const keystorePath = String(parsed.keystorePath ?? parsed.keystore ?? "").trim();
  const keyAlias = String(parsed.keyAlias ?? parsed.alias ?? "").trim();
  const keystorePassword = String(parsed.keystorePassword ?? parsed.keystorePass ?? "").trim();
  const keyPassword = String(parsed.keyPassword ?? parsed.keyPass ?? "").trim();

  return {
    keystorePath: keystorePath || undefined,
    keyAlias: keyAlias || undefined,
    keystorePassword: keystorePassword || undefined,
    keyPassword: keyPassword || undefined,
  };
}

function parseSigningMarkdown(raw: string): PartialSigningConfig {
  const readValue = (pattern: RegExp): string | undefined => {
    const match = raw.match(pattern);
    return match?.[1]?.trim() || undefined;
  };

  return {
    keyAlias: readValue(/Android\s+key\s+alias\s*:\s*(.+)$/im),
    keystorePassword: readValue(/Android\s+upload\s+keystore\s+password\s*:\s*(.+)$/im),
    keyPassword: readValue(/Android\s+key\s+password\s*:\s*(.+)$/im),
  };
}

async function resolveSigningFromJson(signingJson: string): Promise<PartialSigningConfig> {
  const trimmed = signingJson.trim();

  if (trimmed.startsWith("{")) {
    return parseSigningJson(trimmed);
  }

  const filePath = path.resolve(trimmed);
  const raw = await fs.readFile(filePath, "utf8");

  try {
    return parseSigningJson(raw);
  } catch {
    return parseSigningMarkdown(raw);
  }
}

async function promptSigningMethod(): Promise<"prompt" | "json"> {
  const answer = (await promptVisible("Provide signing input: 1) prompt fields  2) JSON [1]: ")).trim();
  if (answer === "2" || answer.toLowerCase() === "json") {
    return "json";
  }
  return "prompt";
}

async function resolveSigningConfig(options: BuildPipelineOptions): Promise<SigningConfig> {
  let keystorePath = options.keystore ?? process.env.AABX_KEYSTORE_PATH;
  let keystorePassword = options.keystorePass ?? process.env.AABX_KEYSTORE_PASSWORD;
  let keyAlias = options.keyAlias ?? process.env.AABX_KEY_ALIAS;
  let keyPassword = options.keyPass ?? process.env.AABX_KEY_PASSWORD;

  const providedSigningJson = options.signingJson;
  if (providedSigningJson && !isBlank(providedSigningJson)) {
    const fromJson = await resolveSigningFromJson(providedSigningJson);
    keystorePath = keystorePath ?? fromJson.keystorePath;
    keystorePassword = keystorePassword ?? fromJson.keystorePassword;
    keyAlias = keyAlias ?? fromJson.keyAlias;
    keyPassword = keyPassword ?? fromJson.keyPassword;
  }

  const interactive = process.stdin.isTTY && process.stdout.isTTY;

  if (interactive) {
    const allMissing = isBlank(keystorePath) && isBlank(keyAlias) && isBlank(keystorePassword) && isBlank(keyPassword);
    if (allMissing) {
      const method = await promptSigningMethod();
      if (method === "json") {
        const jsonInput = await promptVisible("Enter signing JSON or JSON file path: ");
        const fromJson = await resolveSigningFromJson(jsonInput);
        keystorePath = keystorePath ?? fromJson.keystorePath;
        keystorePassword = keystorePassword ?? fromJson.keystorePassword;
        keyAlias = keyAlias ?? fromJson.keyAlias;
        keyPassword = keyPassword ?? fromJson.keyPassword;
      }
    }

    if (isBlank(keystorePath)) {
      keystorePath = await promptVisible("Keystore path: ");
    }
    if (isBlank(keyAlias)) {
      keyAlias = await promptVisible("Key alias: ");
    }
    if (isBlank(keystorePassword)) {
      keystorePassword = await promptHidden("Keystore password: ");
    }
    if (isBlank(keyPassword)) {
      keyPassword = await promptHidden("Key password: ");
    }
  }

  if (isBlank(keystorePath) || isBlank(keystorePassword) || isBlank(keyAlias) || isBlank(keyPassword)) {
    throw new Error(
      "Signed build requires keystore options: --keystore, --keystore-pass, --key-alias, --key-pass, --signing-json (or AABX_KEYSTORE_PATH, AABX_KEYSTORE_PASSWORD, AABX_KEY_ALIAS, AABX_KEY_PASSWORD env vars)",
    );
  }

  return {
    keystorePath: keystorePath!,
    keystorePassword: keystorePassword!,
    keyAlias: keyAlias!,
    keyPassword: keyPassword!,
  };
}

export async function handleBuild(
  inputAab: string,
  options: CommonCommandOptions & {
    output?: string;
    bundletoolVersion?: string;
    install?: boolean;
    device?: string;
    clean?: boolean;
    apkType?: string;
    keystore?: string;
    keystorePass?: string;
    keyAlias?: string;
    keyPass?: string;
    signingJson?: string;
  },
): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ debug: Boolean(options.debug) });

  const { outputApkPath } = await runBuildPipeline(inputAab, {
    output: options.output ?? config.output,
    bundletoolVersion: options.bundletoolVersion ?? config.bundletoolVersion,
    clean: options.clean ?? config.clean,
    debug: options.debug,
    apkType: options.apkType,
    keystore: options.keystore,
    keystorePass: options.keystorePass,
    keyAlias: options.keyAlias,
    keyPass: options.keyPass,
    signingJson: options.signingJson,
  });

  if (options.install) {
    logger.info("Installing built APK to device...");
    await installApk(outputApkPath, options.device);
    logger.info("Install completed.");
  }
}

async function runBuildPipeline(
  inputAab: string,
  pipelineOptions: BuildPipelineOptions,
): Promise<{ outputApkPath: string }> {
  const config = loadConfig();
  const logger = createLogger({ debug: Boolean(pipelineOptions.debug) });

  const resolvedInputAab = path.resolve(inputAab);
  if (!resolvedInputAab.toLowerCase().endsWith(".aab")) {
    throw new Error(`Input must be an .aab file: ${resolvedInputAab}`);
  }

  try {
    await fs.access(resolvedInputAab);
  } catch {
    throw new Error(`Input AAB file does not exist or is not readable: ${resolvedInputAab}`);
  }

  const outputDir = path.resolve(pipelineOptions.output ?? config.output);
  const bundletoolVersion = pipelineOptions.bundletoolVersion ?? config.bundletoolVersion;
  const shouldClean = pipelineOptions.clean ?? config.clean;
  const apkType = await resolveApkType(pipelineOptions.apkType);
  const signing = apkType === "signed" ? await resolveSigningConfig(pipelineOptions) : undefined;

  logger.info(`Starting APK build for: ${resolvedInputAab}`);
  logger.info(`Build type selected: ${apkType}`);
  logger.info("Detecting Java runtime...");
  const java = await detectJava();
  logger.debug("Java detected", java);

  logger.info(`Ensuring BundleTool ${bundletoolVersion} is cached...`);
  const bundletoolJar = await ensureBundletool(bundletoolVersion);

  const inputBaseName = path.parse(resolvedInputAab).name;
  const apksPath = path.join(outputDir, `${inputBaseName}.apks`);
  const outputApkFileName = `${inputBaseName}.apk`;

  logger.info("Running bundletool build-apks...");
  await buildUniversalApks(resolvedInputAab, apksPath, java.bin, bundletoolJar, {
    mode: "universal",
    signing,
  });

  logger.info(`Extracting APK as ${outputApkFileName}...`);
  const outputApkPath = await extractUniversalApk(apksPath, outputDir, outputApkFileName);

  if (shouldClean) {
    await fs.rm(apksPath, { force: true });
  }

  logger.info(`Build completed. APK: ${outputApkPath}`);
  return { outputApkPath };
}

export async function handleInstall(
  input: string,
  options: CommonCommandOptions & { device?: string },
): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ debug: Boolean(options.debug) });

  const resolvedInput = path.resolve(input);
  const lowerInput = resolvedInput.toLowerCase();

  if (lowerInput.endsWith(".apk")) {
    logger.info(`Installing APK: ${resolvedInput}`);
    await installApk(resolvedInput, options.device);
    logger.info("Install completed.");
    return;
  }

  if (lowerInput.endsWith(".aab")) {
    logger.info(`Building from AAB before install: ${resolvedInput}`);
    const { outputApkPath } = await runBuildPipeline(resolvedInput, {
      output: config.output,
      bundletoolVersion: config.bundletoolVersion,
      clean: config.clean,
      debug: options.debug,
    });

    logger.info("Installing built APK to device...");
    await installApk(outputApkPath, options.device);
    logger.info("Install completed.");
    return;
  }

  throw new Error(`Input must be .aab or .apk: ${resolvedInput}`);
}

export async function handleExtract(
  apksFile: string,
  options: CommonCommandOptions & { output?: string },
): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ debug: Boolean(options.debug) });

  const resolvedApksFile = path.resolve(apksFile);
  if (!resolvedApksFile.toLowerCase().endsWith(".apks")) {
    throw new Error(`Input must be a .apks file: ${resolvedApksFile}`);
  }

  const outputDir = path.resolve(options.output ?? config.output);
  const outputApkFileName = `${path.parse(resolvedApksFile).name}.apk`;

  logger.info(`Extracting APK from: ${resolvedApksFile}`);
  const outputApkPath = await extractUniversalApk(resolvedApksFile, outputDir, outputApkFileName);
  logger.info(`Extract completed: ${outputApkPath}`);
}

export async function handleShare(
  apkFile: string,
  options: CommonCommandOptions,
): Promise<void> {
  reportStub("share", { apkFile }, options);
}

export async function handleWatch(options: CommonCommandOptions): Promise<void> {
  reportStub("watch", {}, options);
}

export async function handleDevices(options: CommonCommandOptions): Promise<void> {
  const logger = createLogger({ debug: Boolean(options.debug) });
  const devices = await listDevices();

  if (devices.length === 0) {
    logger.warn("No connected Android devices detected.");
    return;
  }

  for (const device of devices) {
    const modelInfo = device.model ? ` (${device.model})` : "";
    logger.info(`${device.serial}\t${device.state}${modelInfo}`);
  }
}

export async function handleUpdate(
  options: CommonCommandOptions & { bundletoolVersion?: string },
): Promise<void> {
  const config = loadConfig();
  const logger = createLogger({ debug: Boolean(options.debug) });
  const version = options.bundletoolVersion ?? config.bundletoolVersion;

  logger.info(`Ensuring BundleTool ${version} is available in local cache...`);
  const jarPath = await ensureBundletool(version);
  logger.info(`BundleTool ready: ${jarPath}`);
}

export async function handleClean(options: CommonCommandOptions): Promise<void> {
  reportStub("clean", {}, options);
}
