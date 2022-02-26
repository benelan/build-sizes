#!/usr/bin/env node
import { getBuildSizes, formatBytes } from "./index.js";

const ARGUMENT_ERROR = "The path to the build directory is required.";
(async () => {
  try {
    const [buildPath, bundleFileType] = process.argv.splice(2);
    if (!buildPath) throw new Error(ARGUMENT_ERROR);
    const type = bundleFileType || "js";
    const {
      mainBundleName,
      mainBundleSize,
      mainBundleSizeGzip,
      mainBundleSizeBrotli,
      buildSize,
      buildSizeOnDisk,
      buildFileCount,
    } = await getBuildSizes(buildPath, type);

    // logging
    const title = "|> Application Build Sizes <|";
    const line = "~".repeat(title.length);
    const underline = (text) => `\x1b[4m${text}\x1b[0m`;
    const bundle = `Main ${type.toUpperCase()} bundle`;

    console.log(
      `\n${line}\n${title}\n${line}`,
      `\n${underline("Build")}`,
      "\n --> file count:",
      buildFileCount,
      "\n --> size:",
      formatBytes(buildSize),
      buildSizeOnDisk // uses the unix du command
        ? `\n --> on-disk size: ${formatBytes(buildSizeOnDisk)}`
        : "", // not supported on Windows
      `\n${line}`,
      `\n${underline(bundle)}`,
      `\n --> name:`,
      mainBundleName,
      `\n --> size:`,
      formatBytes(mainBundleSize),
      `\n --> gzip size:`,
      formatBytes(mainBundleSizeGzip),
      `\n --> brotli size:`,
      formatBytes(mainBundleSizeBrotli),
      `\n${line}\n`
    );
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
