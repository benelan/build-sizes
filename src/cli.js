#!/usr/bin/env node
import { getBuildSizes, saveBuildSizes, formatBytes } from "./index.js";
import { resolve } from "path";

const FLAG_INFO = {
  path: {
    description: "Path to the build directory",
    required: true,
    value: undefined,
  },
  binary: {
    description:
      "Convert bytes to human readable format in base 2 (default is base 10)",
    required: false,
    value: false,
    boolean: true,
  },
  decimals: {
    description:
      "Decimal places for rounding bytes to a human readable format (default is 2)",
    required: false,
    value: 2,
  },
  filetype: {
    description: "Filetype of the main bundle (default is js)",
    required: false,
    value: "js",
  },
  outfile: {
    description:
      "Path to a file where the build sizes will be saved as CSV data.",
    required: false,
    value: undefined,
  },
};

(async () => {
  try {
    const args = process.argv.splice(2);

    if (!args.length || args.includes("-h") || args.includes("--help")) {
      console.error(help());
      process.exit();
    }

    const flagKeys = Object.keys(FLAG_INFO);
    const flagNameRegex = (f) => new RegExp("--" + f);
    const flagAliasRegex = (f) => new RegExp("-" + f.charAt(0));

    args.forEach((a, i) => {
      flagKeys.forEach((flag) => {
        if (flagNameRegex(flag).test(a) || flagAliasRegex(flag).test(a)) {
          if (a.includes("=")) {
            const value = a.substring(a.indexOf("=") + 1);
            FLAG_INFO[flag].value = value;
          } else if (FLAG_INFO[flag]?.boolean === true) {
            FLAG_INFO[flag].value = !FLAG_INFO[flag].value;
          } else if (args.length > i + 1 && !args[i + 1].startsWith("-")) {
            FLAG_INFO[flag].value = args[i + 1];
          } else {
            throw new Error(`unable to parse value for: "${flag}" flag`);
          }
          console.log(`${flag}: ${FLAG_INFO[flag].value}`);
        } else if (i === 0 && !a.startsWith("-") && !FLAG_INFO.path.value) {
          FLAG_INFO.path.value = a;
          console.log("path: ", a);
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
    console.error("use the --help flag for more information");
    process.exitCode = 1;
  }
})();


/** Returns help text */
function help() {
  return `A small script that provides build sizes to assist with optimization

Usage: build-sizes <path> [options]

Repository
  https://github.com/benelan/build-sizes
 
Arguments
  path [required]
    Path to the build directory

Options
  -b, --binary [boolean]
    Convert bytes to human readable format in base 2 (default is base 10)

  -d, --decimals
    Decimal places for rounding bytes to a human readable format (default is 2)

  -f, --filetype
    Filetype of the main bundle (default is js)

  -o, --outfile
    Path to a file where the build sizes will be saved as CSV data.

  -p, --path [same as argument]:
    Path to the build directory is also available as an option

Examples
  # simplest usage with sane defaults
  build-sizes dist                           

  # can set values with a space or equals sign
  build-sizes dist --filetype css --binary -d=1       

  # use a flag for path if it isn't the first argument
  build-sizes -b -p dist

  # save the build sizes to a csv
  build-sizes dist -o data/build-sizes.csv`;
}
