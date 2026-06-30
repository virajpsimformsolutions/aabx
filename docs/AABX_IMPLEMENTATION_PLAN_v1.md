# AABX Implementation Plan (AAB to Universal APK)

> Version: 1.0
> Scope: Delivery plan for an open-source, cross-platform CLI that converts Android App Bundles (AAB) to installable Universal APKs.

## 1. Outcome Definition

### Primary Outcome

Ship a reliable CLI command that converts a valid `.aab` into a `universal.apk` on macOS, Linux, and Windows using BundleTool.

### Success Criteria

- `aabx build app.aab` produces `dist/universal.apk` with deterministic naming.
- Tool auto-downloads BundleTool if missing and reuses cached versions.
- Tool validates Java and fails with actionable remediation messages.
- Optional install flow works via ADB (`aabx install app.aab`).
- End-to-end tests pass in CI across OS matrix.

### Non-Goals (v1)

- Signing workflow automation beyond debug/dev defaults.
- Manifest diff/inspection.
- Plugin system.

## 1.1 Package Manager Policy

- Default: npm
- Supported alternative: Yarn
- Repository configuration must stay npm-workspaces compatible.
- Commands in docs should show npm first and optionally include Yarn equivalents.

## 2. System Architecture

## 2.1 Monorepo Structure

```text
apps/
  cli/
packages/
  core/
  bundletool/
  android/
  adb/
  doctor/
  config/
  logger/
  shared/
docs/
tests/
examples/
```

## 2.2 Package Responsibilities

- `apps/cli`: Commander.js command parsing, UX, argument mapping, top-level errors.
- `packages/core`: domain types, error hierarchy, orchestration helpers.
- `packages/bundletool`: download/cache BundleTool, run `build-apks`, extract `universal.apk`.
- `packages/android`: Java and Android SDK detection; optional zipalign/apksigner wrappers.
- `packages/adb`: device discovery and APK install.
- `packages/doctor`: environment diagnostics and fix hints.
- `packages/config`: load/validate config file and merge with CLI flags.
- `packages/logger`: shared structured + user-friendly logging.
- `packages/shared`: low-level utils (paths, fs, process, platform helpers).

## 2.3 Runtime Data Flow (Build)

1. CLI receives command and options.
2. Config layer merges defaults, file config, and CLI flags.
3. Doctor prechecks required tools (`java`; `adb` only if install requested).
4. BundleTool layer ensures selected version exists in cache (download if needed).
5. BundleTool runs `build-apks --mode=universal` to create `.apks` archive.
6. Extractor unzips `universal.apk` to output directory.
7. Optional post-step installs APK to chosen device.
8. Result object returned to CLI and rendered in concise summary.

## 3. Command Specifications (v1)

## 3.1 `aabx doctor`

Purpose: verify required dependencies and environment.

Inputs:

- Optional `--json` for machine-readable output.

Checks:

- Java available and version supported.
- Android SDK path discoverable.
- ADB available and callable.
- Write permission for cache/output directories.

Exit Codes:

- `0` all critical checks passed.
- `1` one or more critical checks failed.

## 3.2 `aabx build <input.aab>`

Purpose: convert AAB to universal APK.

Options:

- `--output <dir>` default `./dist`
- `--bundletool-version <version|latest>` default `latest`
- `--install` install after build
- `--device <serial>` target device for install
- `--clean` remove temp artifacts after completion (default true)

Behavior:

- Validates input path and extension.
- Builds `.apks` archive in temp/work dir.
- Extracts `universal.apk` to output dir.
- Prints output path and elapsed time.

Exit Codes:

- `0` success.
- `2` invalid CLI args/input.
- `3` dependency/tooling failure.
- `4` bundletool build failure.
- `5` extraction failure.

## 3.3 `aabx extract <file.apks>`

Purpose: extract universal APK from existing APKS archive.

Options:

- `--output <dir>` default `./dist`

Behavior:

- Validates archive has `universal.apk`.
- Extracts and writes deterministic output path.

## 3.4 `aabx install <input.aab|input.apk>`

Purpose: install to connected device.

Behavior:

- If AAB: run build flow then install produced APK.
- If APK: install directly via ADB.

## 3.5 `aabx devices`

Purpose: list connected devices and status.

Output columns:

- serial
- state
- model (when available)
- transport id (optional)

## 4. Internal API Contracts

## 4.1 Core Types

```ts
export interface BuildOptions {
  inputAabPath: string;
  outputDir: string;
  bundletoolVersion: string;
  installAfterBuild: boolean;
  deviceSerial?: string;
  clean: boolean;
}

export interface BuildResult {
  apksPath: string;
  universalApkPath: string;
  durationMs: number;
}

export interface DoctorCheckResult {
  name: string;
  ok: boolean;
  severity: "critical" | "warning";
  message: string;
  fix?: string;
}
```

## 4.2 Package APIs

- `bundletool.ensureBundletool(version): Promise<string>`
- `bundletool.buildUniversalApks(aabPath, outApksPath, javaBin, bundletoolJar): Promise<void>`
- `bundletool.extractUniversalApk(apksPath, outputDir): Promise<string>`
- `android.detectJava(): Promise<{ bin: string; version: string }>`
- `adb.listDevices(): Promise<Device[]>`
- `adb.installApk(apkPath, deviceSerial?): Promise<void>`
- `doctor.runChecks(context): Promise<DoctorCheckResult[]>`

## 5. Implementation Milestones

## M1. CLI Foundation (Week 1)

Deliverables:

- workspace bootstrapped with npm workspaces + turborepo (Yarn-compatible)
- command skeletons wired via Commander.js
- shared logger/config wiring

Acceptance:

- `aabx --help` and all command help pages render correctly.

## M2. BundleTool Management (Week 1-2)

Deliverables:

- fetch latest release metadata
- download selected jar
- cache by version + checksum

Acceptance:

- offline reruns work when cache exists.

## M3. Universal APK Build (Week 2)

Deliverables:

- AAB input validation
- invoke bundletool `build-apks --mode=universal`
- APKS extraction to universal APK

Acceptance:

- test fixture AAB produces installable universal APK.

## M4. ADB Install + Devices (Week 3)

Deliverables:

- list devices
- install generated APK
- optional serial targeting

Acceptance:

- success and failure paths verified with mocked and live tests.

## M5. Expo/EAS Integration (Week 3)

Deliverables:

- detect Expo project root
- discover likely EAS local build outputs
- optional auto-pick latest AAB

Acceptance:

- from Expo app directory, `aabx build` works with minimal args.

## M6. CI/CD + Release (Week 4)

Deliverables:

- lint/test/build GitHub Actions workflows
- changesets-based versioning/release
- npm publish pipeline

Acceptance:

- tag -> package release flow validated on dry run.

## 6. Testing Strategy

## 6.1 Test Layers

- Unit tests: parser, path logic, config merging, error mapping.
- Integration tests: bundletool invocation and extraction with fixtures.
- CLI tests: command behavior, output snapshots, exit codes.
- E2E smoke tests: build and optional install on runner/device lab.

## 6.2 Core Test Matrix

- OS: macOS, Ubuntu, Windows.
- Node: active LTS versions.
- Inputs: valid AAB, missing file, corrupted AAB, permission denied paths.
- Tool states: bundletool cached/missing, java found/missing, adb found/missing.

## 6.3 High-Value Negative Tests

- Java missing: receives clear install instructions.
- Bundletool download fails: retries and emits root cause.
- APKS missing `universal.apk`: extraction fails with actionable message.
- ADB install fails due to no devices: suggests `aabx devices`.

## 7. CI/CD Blueprint

## 7.1 Required Workflows

- `ci.yml`: lint + typecheck + test + build on PR.
- `release.yml`: changesets publish on main.
- `nightly.yml` (optional): integration smoke for dependency drift.

## 7.2 Example Job Order

1. checkout
2. setup npm (or Yarn)/node cache
3. install dependencies
4. lint
5. typecheck
6. test
7. build

## 7.3 Artifact Policy

- retain test reports and coverage.
- keep packaged CLI artifacts on release runs.

## 7.4 CI Package Manager Policy

- Use npm as the default command set in CI workflows.
- Keep scripts and workspace configuration Yarn-compatible.
- In CI, avoid package-manager-specific flags that break cross-manager compatibility.

## 8. Error Handling and UX Rules

- Every thrown internal error maps to stable user-facing error code.
- Human-readable message first; verbose stack under `--debug`.
- Commands print actionable next step on failure.
- Spinner usage only for operations longer than ~300ms.

## 9. Security and Reliability

- Validate all filesystem and process inputs with Zod.
- Verify downloaded bundletool checksum/signature when available.
- Avoid shell interpolation; use argument arrays with execa.
- Restrict temp dirs and clean up reliably in finally blocks.

## 10. Build Command Pseudocode

```ts
async function buildUniversalApk(options: BuildOptions): Promise<BuildResult> {
  const startedAt = Date.now();

  await validateAabInput(options.inputAabPath);
  const java = await detectJava();
  const bundletoolJar = await ensureBundletool(options.bundletoolVersion);

  const apksPath = await createApksPath(options.outputDir);
  await buildUniversalApks(
    options.inputAabPath,
    apksPath,
    java.bin,
    bundletoolJar,
  );

  const universalApkPath = await extractUniversalApk(
    apksPath,
    options.outputDir,
  );

  if (options.installAfterBuild) {
    await installApk(universalApkPath, options.deviceSerial);
  }

  if (options.clean) {
    await cleanupTempArtifacts(apksPath);
  }

  return {
    apksPath,
    universalApkPath,
    durationMs: Date.now() - startedAt,
  };
}
```

## 11. Execution Checklist

1. Initialize monorepo and package boundaries.
2. Implement `doctor` checks first to harden developer environment assumptions.
3. Implement bundletool download/cache and test independently.
4. Implement `build` flow end to end with fixture AAB.
5. Add `extract`, then `install`, then `devices`.
6. Add Expo/EAS convenience detection.
7. Finalize CI workflows and release automation.
8. Publish alpha and collect early feedback.

## 12. Definition of Done (v1)

- Commands: `doctor`, `build`, `extract`, `install`, `devices` are production-ready.
- Cross-platform CI passes with stable tests.
- Documentation includes quickstart and troubleshooting.
- npm package installable and executable via `npx aabx`.
- At least one Expo sample flow documented in `examples/`.
