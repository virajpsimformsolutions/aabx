import { promises as fs } from "node:fs";
import path from "node:path";
import { listDevices } from "../../adb/src/index.js";
import { detectJava } from "../../android/src/index.js";
import type { DoctorCheckResult } from "../../core/src/index.js";

export interface DoctorContext {
  outputDir?: string;
}

export async function runChecks(context: DoctorContext = {}): Promise<DoctorCheckResult[]> {
  const checks: DoctorCheckResult[] = [];

  checks.push(await checkJava());
  checks.push(await checkAdb());
  checks.push(checkAndroidSdkEnvironment());
  checks.push(await checkOutputDirectoryWritable(context.outputDir ?? "./dist"));

  return checks;
}

async function checkJava(): Promise<DoctorCheckResult> {
  try {
    const java = await detectJava();
    return {
      name: "java",
      ok: true,
      severity: "critical",
      message: `Java detected (${java.version}) at ${java.bin}`,
    };
  } catch (error) {
    return {
      name: "java",
      ok: false,
      severity: "critical",
      message: errorMessage(error),
      fix: "Install JDK 17+ and ensure JAVA_HOME or PATH points to java.",
    };
  }
}

async function checkAdb(): Promise<DoctorCheckResult> {
  try {
    const devices = await listDevices();
    return {
      name: "adb",
      ok: true,
      severity: "critical",
      message: `ADB available (${devices.length} device${devices.length === 1 ? "" : "s"} connected).`,
    };
  } catch (error) {
    return {
      name: "adb",
      ok: false,
      severity: "critical",
      message: errorMessage(error),
      fix: "Install Android Platform Tools and ensure adb is available on PATH.",
    };
  }
}

function checkAndroidSdkEnvironment(): DoctorCheckResult {
  const sdkRoot = process.env.ANDROID_SDK_ROOT;
  const androidHome = process.env.ANDROID_HOME;
  const value = sdkRoot ?? androidHome;

  if (value && value.trim().length > 0) {
    return {
      name: "android-sdk",
      ok: true,
      severity: "warning",
      message: `Android SDK path detected: ${value}`,
    };
  }

  return {
    name: "android-sdk",
    ok: false,
    severity: "warning",
    message: "ANDROID_SDK_ROOT / ANDROID_HOME is not set.",
    fix: "Set ANDROID_SDK_ROOT to your Android SDK directory for consistent tooling behavior.",
  };
}

async function checkOutputDirectoryWritable(outputDir: string): Promise<DoctorCheckResult> {
  const resolved = path.resolve(outputDir);
  try {
    await fs.mkdir(resolved, { recursive: true });
    await fs.access(resolved, fs.constants.W_OK);
    return {
      name: "output-dir",
      ok: true,
      severity: "critical",
      message: `Output directory writable: ${resolved}`,
    };
  } catch (error) {
    return {
      name: "output-dir",
      ok: false,
      severity: "critical",
      message: errorMessage(error),
      fix: `Ensure write permissions for output directory: ${resolved}`,
    };
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
