import { promises as fs } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
export async function detectJava() {
    const javaFromHome = process.env.JAVA_HOME
        ? path.join(process.env.JAVA_HOME, "bin", process.platform === "win32" ? "java.exe" : "java")
        : null;
    const candidates = [javaFromHome, "java"].filter((value) => Boolean(value));
    let lastError;
    for (const candidate of candidates) {
        try {
            if (candidate !== "java") {
                await fs.access(candidate);
            }
            const output = await runCommand(candidate, ["-version"]);
            const version = parseJavaVersion(output.stderr || output.stdout);
            return {
                bin: candidate,
                version,
            };
        }
        catch (error) {
            lastError = error;
        }
    }
    const message = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown error");
    throw new Error(`Java is required but was not detected. Install JDK 17+ and ensure JAVA_HOME or PATH is set. (${message})`);
}
function parseJavaVersion(output) {
    const match = output.match(/version\s+"([^"]+)"/i);
    if (!match) {
        return "unknown";
    }
    return match[1] ?? "unknown";
}
async function runCommand(command, args) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: ["ignore", "pipe", "pipe"],
        });
        let stdout = "";
        let stderr = "";
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
            resolve({ stdout, stderr });
        });
    });
}
//# sourceMappingURL=index.js.map