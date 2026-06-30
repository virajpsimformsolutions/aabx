# AABX

AABX is a CLI to convert Android App Bundles (.aab) into installable APKs, then optionally install them on a connected Android device.

## What AABX Can Do

- Build an APK from an .aab file (universal or signed)
- Install an .apk directly to a device
- Build from .aab and install in one command
- Extract APK from a .apks archive
- List connected Android devices
- Check local environment readiness (Java, ADB, SDK, output directory)
- Pre-cache BundleTool versions

## Requirements

- Node.js 22+
- npm 11+
- Java 17+ available in PATH
- ADB available in PATH
- Android SDK installed (recommended)

## Install

### From source (current repo)

```bash
npm install
npm run build
```

### Run CLI in this repo

```bash
npm --workspace @mspvirajpatel/aabx run dev -- <command>
```

Example:

```bash
npm --workspace @mspvirajpatel/aabx run dev -- doctor --json
```

## Quick Start

1. Check environment:

```bash
npm --workspace @mspvirajpatel/aabx run dev -- doctor
```

2. Build APK:

```bash
npm --workspace @mspvirajpatel/aabx run dev -- build ./app-release.aab
```

3. Build and install to device:

```bash
npm --workspace @mspvirajpatel/aabx run dev -- build ./app-release.aab --install
```

## Command Reference

### Global options

- --debug: enable verbose logs

Use as:

```bash
npm --workspace @mspvirajpatel/aabx run dev -- --debug <command>
```

### doctor

Run environment checks.

```bash
npm --workspace @mspvirajpatel/aabx run dev -- doctor [--json]
```

Options:

- --json: machine-readable output

### build <inputAab>

Convert .aab to APK. If no APK type is provided, CLI asks:

- 1) universal
- 2) signed

```bash
npm --workspace @mspvirajpatel/aabx run dev -- build <inputAab> [options]
```

Options:

- -o, --output <dir>: output directory (default: ./dist)
- --apk-type <type>: universal/signed or 1/2
- --signing-json <jsonOrPath>: signing config as inline JSON, JSON file, or markdown credential file
- --keystore <path>: keystore path for signed build
- --keystore-pass <password>: keystore password for signed build
- --key-alias <alias>: key alias for signed build
- --key-pass <password>: key password for signed build
- --bundletool-version <version>: BundleTool version (default: latest)
- --install: install APK after build
- --device <serial>: target ADB device serial
- --no-clean: keep temporary .apks artifact

Examples:

```bash
npm --workspace @mspvirajpatel/aabx run dev -- build ./my-app.aab
npm --workspace @mspvirajpatel/aabx run dev -- build ./my-app.aab --install
npm --workspace @mspvirajpatel/aabx run dev -- build ./my-app.aab --install --device emulator-5554
npm --workspace @mspvirajpatel/aabx run dev -- build ./my-app.aab -o ./out --bundletool-version 1.17.2
npm --workspace @mspvirajpatel/aabx run dev -- build ./my-app.aab --apk-type 2
npm --workspace @mspvirajpatel/aabx run dev -- build ./my-app.aab --apk-type signed --keystore ./my-upload-key.jks --keystore-pass '***' --key-alias upload --key-pass '***'
npm --workspace @mspvirajpatel/aabx run dev -- build ./my-app.aab --apk-type signed --signing-json ./signing.json
```

If signed mode is selected and signing values are missing, AABX asks how you want to provide them:

- 1) prompt fields (keystore path, alias, hidden passwords)
- 2) JSON (inline JSON or JSON file path)

Password prompts are hidden (not echoed).

Signed build can also use environment variables instead of CLI flags:

```bash
export AABX_KEYSTORE_PATH=./my-upload-key.jks
export AABX_KEYSTORE_PASSWORD='***'
export AABX_KEY_ALIAS=upload
export AABX_KEY_PASSWORD='***'
npm --workspace @mspvirajpatel/aabx run dev -- build ./my-app.aab --apk-type signed
```

Output file name matches your input file name. Example:

- input: coco.aab
- output: coco.apk

### install <input>

Install .apk directly, or build from .aab then install.

```bash
npm --workspace @mspvirajpatel/aabx run dev -- install <input> [--device <serial>]
```

Examples:

```bash
npm --workspace @mspvirajpatel/aabx run dev -- install ./app-universal.apk
npm --workspace @mspvirajpatel/aabx run dev -- install ./app-release.aab
npm --workspace @mspvirajpatel/aabx run dev -- install ./app-universal.apk --device emulator-5554
```

### extract <apksFile>

Extract APK from a .apks archive.

```bash
npm --workspace @mspvirajpatel/aabx run dev -- extract <apksFile> [-o <dir>]
```

Example:

```bash
npm --workspace @mspvirajpatel/aabx run dev -- extract ./app-release.apks -o ./artifacts
```

Extracted APK file name is derived from the .apks file name.

### devices

List connected devices reported by ADB.

```bash
npm --workspace @mspvirajpatel/aabx run dev -- devices
```

### update

Ensure a BundleTool version is downloaded in local cache.

```bash
npm --workspace @mspvirajpatel/aabx run dev -- update [--bundletool-version <version>]
```

Examples:

```bash
npm --workspace @mspvirajpatel/aabx run dev -- update
npm --workspace @mspvirajpatel/aabx run dev -- update --bundletool-version 1.17.2
```

### init, share, watch, clean

These commands are currently scaffolded and print placeholder output:

- init
- share <apkFile>
- watch
- clean

## Common Workflows

### Build and install in one shot

```bash
npm --workspace @mspvirajpatel/aabx run dev -- build ./app-release.aab --install
```

### Install existing APK only

```bash
npm --workspace @mspvirajpatel/aabx run dev -- install ./universal.apk
```

### Extract APK from an existing APKS file

```bash
npm --workspace @mspvirajpatel/aabx run dev -- extract ./bundle.apks
```

## Troubleshooting

- "Input AAB file does not exist": verify file path and extension is .aab
- "Input must be .aab or .apk": use valid artifact type for install command
- "No connected Android devices detected": run adb devices and connect/emulate device
- Doctor critical failures: run doctor and apply suggested fixes

## Related Docs

- docs/SETUP.md
- docs/NPM_RELEASE_PLAN.md
