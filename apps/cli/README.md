# @mspvirajpatel/aabx

AABX is a CLI to convert Android App Bundles (`.aab`) into installable APKs using Bundletool.

## Install

```bash
npm i -g @mspvirajpatel/aabx
```

## Quick Start

Convert an AAB to APK:

```bash
aabx build ./app-release.aab
```

Build and install on connected device:

```bash
aabx build ./app-release.aab --install
```

Run environment checks:

```bash
aabx doctor --json
```

List devices:

```bash
aabx devices
```

## Build Modes

- `universal` (or `1`): Generate universal APK
- `signed` (or `2`): Generate signed APK (uses keystore details)

Example signed build:

```bash
aabx build ./app-release.aab --apk-type 2 --signing-json ./signing.json
```

## Signing JSON format

```json
{
  "keystorePath": "./upload-key.jks",
  "keyAlias": "upload",
  "keystorePassword": "<keystore password>",
  "keyPassword": "<key password>"
}
```

Environment placeholders are also supported in JSON values (useful for CI):

```json
{
  "keystorePath": "$AABX_KEYSTORE_PATH",
  "keyAlias": "$AABX_KEY_ALIAS",
  "keystorePassword": "$AABX_KEYSTORE_PASSWORD",
  "keyPassword": "$AABX_KEY_PASSWORD"
}
```

Supported placeholder formats: `$VAR_NAME`, `${VAR_NAME}`, `env:VAR_NAME`.

## Output naming

The output APK name follows the input AAB filename.

Example:

- Input: `coco.aab`
- Output: `coco.apk`
