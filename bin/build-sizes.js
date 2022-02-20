#!/usr/bin/env node
const { getBuildSizes, formatBytes } = require("../index.js");

(async () => {
  try {
    const [buildPath, bundleFileType] = process.argv.splice(2);

    if (!buildPath) {
      throw new Error(
        "Error: Invalid or missing arguments. The path to the build directory is required."
      );
    }

    const { mainBundleSize, buildSize, buildFileCount } = await getBuildSizes(
      buildPath,
      bundleFileType || "js"
    );

    const title = "|-> Application Build Sizes <-|";
    const line = "-".repeat(title.length);
    
    console.log(
      `\n${line}\n${title}\n${line}`,
      `\nMain ${bundleFileType || "js"} bundle size:`,
      formatBytes(mainBundleSize),
      "\nOn-disk build size:",
      formatBytes(buildSize),
      "\nOn-disk build files:",
      buildFileCount,
      `\n${line}\n`
    );
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
