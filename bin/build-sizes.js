#!/usr/bin/env node
const { getBuildSizes, formatBytes } = require("../index.js");

/**
 * Emphasizes a message in the console
 * @param {string} message - text to log
 */
const logHeader = (message) => {
  const line = "-".repeat(message.length + 8);
  console.log(`${line}\n|-> ${message} <-|\n${line}`);
};

(async () => {
  try {
    const [buildPath] = process.argv.splice(2);

    if (!buildPath) {
      throw new Error(
        "Error: Invalid or missing arguments. The path from the current working directory to the production build directory is a required."
      );
    }

    const { mainBundleSize, buildSize, buildFileCount } = await getBuildSizes(
      buildPath
    );

    const headerText = "Application Build Sizes";
    logHeader(headerText);

    console.log(
      "Main bundle size: ",
      formatBytes(mainBundleSize),
      "\nOn-disk size: ",
      formatBytes(buildSize),
      "\nOn-disk files: ",
      buildFileCount
    );

    console.log("-".repeat(headerText.length + 8));
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
