#!/usr/bin/env node
import { getBuildSizes, formatBytes } from "./index.js";

const HELP_MESSAGE = "TODO: help message";

const FLAG_INFO = {
  path: {
    description: "path to the build directory",
    required: true,
    value: null,
  },
  binary: {
    description: "convert bytes to human readable format in base 2",
    required: false,
    value: false,
    boolean: true,
  },
  decimals: {
    description: "decimal places for rounding",
    required: false,
    value: 2,
  },
  filetype: {
    description: "filetype of the main bundle",
    required: false,
    value: "js",
  },
};

(async () => {
  try {
    const args = process.argv.splice(2);

    if (
      !args ||
      !args.length ||
      args.includes("-h") ||
      args.includes("--help")
    ) {
      throw new Error(HELP_MESSAGE);
    }

    const flagKeys = Object.keys(FLAG_INFO);
    const flagNameRegex = (f) => new RegExp("--" + f);
    const flagAliasRegex = (f) => new RegExp("-" + f.charAt(0));

    args.forEach((a, i) => {
      console.log(a);
      flagKeys.forEach((flag) => {
        console.log(FLAG_INFO[flag]);
        if (flagNameRegex(flag).test(a) || flagAliasRegex(flag).test(a)) {
          console.log("flag provided: ", flag);
          if (a.includes("=")) {
            const value = a[i].substring(a[i].indexOf("=") + 1);
            FLAG_INFO[flag].value = value;
          } else if (FLAG_INFO[flag]?.boolean === true) {
            console.log("boolean flag: ", flag);
            FLAG_INFO[flag].value = true;
          } else if (args.length > i + 1 && args[i + 1].charAt(0) !== "-") {
            console.log("flag with space: ", flag);
            FLAG_INFO[flag].value = args[i + 1];
          } else {
            throw new Error("unable to parse flag: ", flag);
          }
        } else {
          if (FLAG_INFO[flag].required) {
            throw new Error("required flag missing: ", flag);
          }
        }
      });
    });

    if (FLAG_INFO.path?.value === undefined) {
      throw new Error(
        "invalid or missing arguments. The path to the build directory is required."
      );
    }

    // check second arg for file type
    const type = FLAG_INFO["filetype"].value;
    const decimals = FLAG_INFO["decimals"].value;
    const path = FLAG_INFO["path"].value;
    const binary = FLAG_INFO["binary"].value;

    const {
      mainBundleName,
      mainBundleSize,
      mainBundleSizeGzip,
      mainBundleSizeBrotli,
      buildSize,
      buildSizeOnDisk,
      buildFileCount,
    } = await getBuildSizes(path, decimals);

    const title = "|> Application Build Sizes <|";
    const line = "~".repeat(title.length);

    console.log(
      `\n${line}\n${title}\n${line}`,
      `\n Build`,
      "\n --> file count:",
      buildFileCount,
      "\n --> size:",
      formatBytes(buildSize, decimals, binary),
      buildSizeOnDisk // uses the unix du command
        ? `\n --> on-disk size: ${formatBytes(
            buildSizeOnDisk,
            decimals,
            binary
          )}`
        : "", // not supported on Windows
      `\n${line}`,
      `\n Main ${type.toUpperCase()} bundle`,
      `\n --> name:`,
      mainBundleName,
      `\n --> size:`,
      formatBytes(mainBundleSize, decimals, binary),
      `\n --> gzip size:`,
      formatBytes(mainBundleSizeGzip, decimals, binary),
      `\n --> brotli size:`,
      formatBytes(mainBundleSizeBrotli, decimals, binary),
      `\n${line}\n`
    );
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
