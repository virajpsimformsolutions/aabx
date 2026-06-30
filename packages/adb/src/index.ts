import { spawn } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";

export interface Device {
  serial: string;
  state: string;
  model?: string;
}

export async function listDevices(): Promise<Device[]> {
  const result = await runAdbCommand(["devices", "-l"]);
  const lines = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines
    .filter((line) => !line.startsWith("List of devices attached"))
    .map(parseDeviceLine)
    .filter((device): device is Device => device !== null);
}

export async function installApk(apkPath: string, deviceSerial?: string): Promise<void> {
  const resolvedApkPath = path.resolve(apkPath);
  if (!resolvedApkPath.toLowerCase().endsWith(".apk")) {
    throw new Error(`Expected an .apk file for install: ${resolvedApkPath}`);
  }

  try {
    await fs.access(resolvedApkPath);
  } catch {
    throw new Error(`APK file does not exist or is not readable: ${resolvedApkPath}`);
  }

  const args = [...(deviceSerial ? ["-s", deviceSerial] : []), "install", "-r", resolvedApkPath];
  await runAdbCommand(args);
}

function parseDeviceLine(line: string): Device | null {
  const serialMatch = line.match(/^(\S+)\s+(\S+)(.*)$/);
  if (!serialMatch) {
    return null;
  }

  const serial = serialMatch[1] ?? "";
  const state = serialMatch[2] ?? "";
  const remainder = serialMatch[3] ?? "";

  const modelMatch = remainder.match(/\bmodel:(\S+)/);

  return {
    serial,
    state,
    model: modelMatch?.[1],
  };
}

async function runAdbCommand(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("adb", args, {
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      reject(
        new Error(
          `Unable to execute adb. Ensure Android Platform Tools are installed and adb is on PATH. (${error.message})`,
        ),
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`adb ${args.join(" ")} failed with exit code ${code}: ${stderr || stdout}`));
        return;
      }

      resolve({ stdout, stderr });
    });
  });
}
