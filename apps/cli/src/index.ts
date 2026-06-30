#!/usr/bin/env node

import { Command } from "commander";
import {
    handleBuild,
    handleClean,
    handleDevices,
    handleDoctor,
    handleExtract,
    handleInit,
    handleInstall,
    handleShare,
    handleUpdate,
    handleWatch,
} from "./commands/handlers.js";

const program = new Command();

program
  .name("aabx")
  .description("AABX CLI for converting Android App Bundles to Universal APKs")
  .version("0.1.0")
  .option("--debug", "Enable verbose debug logging");

program
  .command("init")
  .description("Initialize AABX config in current project")
  .action(async () => handleInit(program.opts()));

program
  .command("doctor")
  .description("Run environment checks")
  .option("--json", "Print machine-readable output")
  .action(async (options) => handleDoctor({ ...program.opts(), ...options }));

program
  .command("build")
  .description("Convert AAB to APK")
  .argument("<inputAab>", "Path to input .aab file")
  .option("-o, --output <dir>", "Output directory")
  .option("--apk-type <type>", "APK type: universal/signed or 1/2")
  .option("--signing-json <jsonOrPath>", "Signing config JSON string or JSON file path")
  .option("--keystore <path>", "Path to keystore for signed build")
  .option("--keystore-pass <password>", "Keystore password for signed build")
  .option("--key-alias <alias>", "Key alias for signed build")
  .option("--key-pass <password>", "Key password for signed build")
  .option("--bundletool-version <version>", "BundleTool version", "latest")
  .option("--install", "Install APK after build", false)
  .option("--device <serial>", "ADB device serial")
  .option("--no-clean", "Keep temporary artifacts after build")
  .action(async (inputAab, options) => handleBuild(inputAab, { ...program.opts(), ...options }));

program
  .command("install")
  .description("Install AAB or APK to device")
  .argument("<input>", "Path to .aab or .apk")
  .option("--device <serial>", "ADB device serial")
  .action(async (input, options) => handleInstall(input, { ...program.opts(), ...options }));

program
  .command("extract")
  .description("Extract APK from .apks archive")
  .argument("<apksFile>", "Path to .apks file")
  .option("-o, --output <dir>", "Output directory")
  .action(async (apksFile, options) => handleExtract(apksFile, { ...program.opts(), ...options }));

program
  .command("share")
  .description("Share APK artifact")
  .argument("<apkFile>", "Path to .apk file")
  .action(async (apkFile) => handleShare(apkFile, program.opts()));

program
  .command("watch")
  .description("Watch for new AAB builds and process automatically")
  .action(async () => handleWatch(program.opts()));

program
  .command("devices")
  .description("List connected ADB devices")
  .action(async () => handleDevices(program.opts()));

program
  .command("update")
  .description("Update BundleTool and cached dependencies")
  .option("--bundletool-version <version>", "BundleTool version", "latest")
  .action(async (options) => handleUpdate({ ...program.opts(), ...options }));

program
  .command("clean")
  .description("Clean AABX caches and temporary files")
  .action(async () => handleClean(program.opts()));

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
