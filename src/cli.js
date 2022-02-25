#!/usr/bin/env node
import { getBuildSizes, formatBytes } from "./index.js";

(async () => {
  try {
    const [buildPath, bundleFileType] = process.argv.splice(2);

    if (!buildPath) {
      throw new Error(
        "Error: Invalid or missing arguments. The path to the build directory is required."
      );
    }
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

    const title = "|> Application Build Sizes <|";
    const line = "~".repeat(title.length);

    console.log(
      `\n${line}\n${title}\n${line}`,
      `\n Build`,
      "\n --> file count:",
      buildFileCount,
      "\n --> size:",
      formatBytes(buildSize),
      buildSizeOnDisk // uses the unix du command
        ? `\n --> on-disk size: ${formatBytes(buildSizeOnDisk, 2, false)}`
        : "", // not supported on Windows
      `\n${line}`,
      `\n Main ${type.toUpperCase()} bundle`,
      `\n --> name:`,
      mainBundleName,
      `\n --> size:`,
      formatBytes(mainBundleSize, 2, false),
      `\n --> gzip size:`,
      formatBytes(mainBundleSizeGzip, 2, false),
      `\n --> brotli size:`,
      formatBytes(mainBundleSizeBrotli, 2, false),
      `\n${line}\n`
    );
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
