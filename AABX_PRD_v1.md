# AABX -- Product Requirements Document (PRD)

> Version: 1.0

## Vision

AABX is an open-source, cross-platform CLI toolkit for Android App
Bundles (AAB), focused on Expo and React Native developers.

## Goals

-   Convert AAB to Universal APK using BundleTool
-   Auto-download BundleTool
-   Detect Java/Android SDK/ADB
-   Install APK to devices
-   Expo & EAS integration
-   Cross-platform support
-   npm-ready CLI

## Tech Stack

-   TypeScript
-   npm Workspaces (Yarn-compatible)
-   TurboRepo
-   Commander.js
-   Execa
-   Ora
-   Chalk
-   Zod
-   Vitest
-   ESLint
-   Prettier
-   Changesets

## Package Manager Policy

-   Default package manager: npm
-   Supported alternative: Yarn
-   Workspace configuration must remain npm Workspaces compatible
-   Documentation and examples should use npm first, with Yarn equivalents where useful

## Monorepo

``` text
apps/
  cli/
packages/
  core/
  bundletool/
  adb/
  android/
  doctor/
  logger/
  config/
  shared/
docs/
tests/
examples/
```

## CLI Commands

``` bash
aabx init
aabx doctor
aabx build app.aab
aabx install app.aab
aabx extract app.apks
aabx share app.apk
aabx watch
aabx devices
aabx update
aabx clean
```

## Modules

### Core

Shared interfaces, errors, utilities.

### BundleTool

-   Download latest release
-   Cache locally
-   Build APKS
-   Extract universal.apk

### Android

-   Java detection
-   SDK detection
-   zipalign
-   apksigner

### ADB

-   Detect devices
-   Install APK
-   Device specs

### Expo

-   Detect Expo project
-   Detect EAS local build output
-   Auto-find latest AAB

## Configuration

``` ts
export default {
  output: "./dist",
  bundletoolVersion: "latest",
  installAfterBuild: false,
  clean: true
}
```

## Milestones

1.  CLI foundation
2.  BundleTool integration
3.  Universal APK build
4.  ADB integration
5.  Expo integration
6.  Advanced Android tools
7.  CI/CD
8.  npm release

## GitHub Actions

-   Build
-   Lint
-   Test
-   Release

CI package manager policy:
-   Default to npm commands in workflows.
-   Keep workflow structure Yarn-compatible for contributors who use Yarn locally.

## Coding Standards

-   Strict TypeScript
-   No implicit any
-   Unit tests
-   Cross-platform compatibility

## Future Roadmap

-   APK signing
-   Manifest inspector
-   APK diff
-   QR sharing
-   Watch mode
-   Plugin system

------------------------------------------------------------------------

This is the initial PRD. Expand into architecture, command specs, API
docs, testing, CI, and implementation guides in subsequent documents.
