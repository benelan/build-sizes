#!/usr/bin/env node
import { getBuildSizes, saveBuildSizes, formatBytes } from "./index.js";
import { resolve } from "path";

const HELP_MESSAGE = "TODO: help message";

const FLAG_INFO = {
  path: {
    description: "path to the build directory",
    required: true,
    value: undefined,
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
  outfile: {
    description:
      "path to a file where the build sizes will be saved as CSV data",
    required: false,
    value: undefined,
  },
};

(async () => {
  try {
    const args = process.argv.splice(2);

    if (!args.length || args.includes("-h") || args.includes("--help")) {
      console.error(HELP_MESSAGE);
      process.exit();
    }

    const flagKeys = Object.keys(FLAG_INFO);
    const flagNameRegex = (f) => new RegExp("--" + f);
    const flagAliasRegex = (f) => new RegExp("-" + f.charAt(0));

    args.forEach((a, i) => {
      flagKeys.forEach((flag) => {
        if (flagNameRegex(flag).test(a) || flagAliasRegex(flag).test(a)) {
          console.log("flag provided: ", flag);
          if (a.includes("=")) {
            const value = a.substring(a.indexOf("=") + 1);
            FLAG_INFO[flag].value = value;
          } else if (FLAG_INFO[flag]?.boolean === true) {
            console.log("boolean flag: ", flag);
            FLAG_INFO[flag].value = !FLAG_INFO[flag].value;
          } else if (args.length > i + 1 && !args[i + 1].startsWith("-")) {
            console.log("flag with space: ", flag);
            FLAG_INFO[flag].value = args[i + 1];
          } else {
            throw new Error(`unable to parse value for: "${flag}" flag`);
          }
        } else if (
          !a.startsWith("-") &&
          !FLAG_INFO.path.value &&
          (i === 0 || !args[i - 1].startsWith("-") || args[i - 1].includes("="))
        ) {
          console.log(args[i - 1]);
          FLAG_INFO.path.value = a;
        }
      });
    });

    if (FLAG_INFO.path.value === undefined) {
      throw new Error("The path to the build directory is required.");
    }

    // get values for flags, some of which are likely defaults
    const type = FLAG_INFO["filetype"].value;
    const decimals = FLAG_INFO["decimals"].value;
    const path = resolve(FLAG_INFO["path"].value);
    const binary = FLAG_INFO["binary"].value;
    const outfile = FLAG_INFO["outfile"]?.value;

    const buildSizes = await getBuildSizes(path, type);

    if (outfile) {
      saveBuildSizes(buildSizes, outfile);
    }

    const {
      mainBundleName,
      mainBundleSize,
      mainBundleSizeGzip,
      mainBundleSizeBrotli,
      buildSize,
      buildSizeOnDisk,
      buildFileCount,
    } = buildSizes;

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
      formatBytes(buildSize, decimals, binary),
      buildSizeOnDisk // uses the unix du command
        ? `\n --> on-disk size: ${formatBytes(
            buildSizeOnDisk,
            decimals,
            binary
          )}`
        : "", // not supported on Windows
      `\n${line}`,
      `\n${underline(bundle)}`,
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
