#!/usr/bin/env node
import { getBuildSizes, saveBuildSizes, formatBytes, help } from "./index.js";

const FLAG_INFO = {
  loader: {
    description:
      "Show a loading animation while determining the build size",
    boolean: true,
  },
  binary: {
    description:
      "Convert bytes to a human readable format in base 2 instead of base 10",
    boolean: true,
  },
  decimals: {
    description:
      "Number of decimal places for rounding bytes to a human readable format",
    default: 2,
  },
  filetype: {
    description: "Filetype of the main bundle",
    default: "js",
  },
  outfile: {
    description: "Path to a file for saving build sizes as CSV data",
  },
  path: {
    description: "Path to the build directory (also available as argument)",
    required: true,
  },
};

/**
 * Use ANSI Codes to create an animation interval on the first run, and clear
 * the interval on any subsequent executions.
 *
 * @private
 * @since v3.1.0
 */
const toggleLoadingAnimation = (() => {
  let called = false;
  let interval;

  return () => {
    if (!called) {
      // clear interval for all exit event types
      [
        "exit",
        "SIGINT",
        "SIGUSR1",
        "SIGUSR2",
        "uncaughtException",
        "SIGTERM",
      ].forEach((event) => {
        process.once(event, toggleLoadingAnimation);
      });
      // hide cursor
      process.stdout.write("\u001B[?25l\r");
      let count = 0;
      interval = setInterval(() => {
        if (count % 11 === 0)
          // reset animation: delete line, send cursor to start, add emoji
          process.stdout.write(`\u001B[2K\r${["🔨 ", "📏 "][count % 2]}`);
        // add the ... animation
        else process.stdout.write(".");
        count += 1;
      }, 100);
      called = true;
    } else {
      clearInterval(interval);
      // show cursor and delete loading message
      process.stdout.write("\u001B[2K\r\u001B[?25h");
    }
  };
})();

// bold and underline text using ansi codes
const underline = (text) => `\x1b[4m${text}\x1b[0m`;
// const bold = (text) => `\u001b[1m${text}\x1b[0m`;

(async () => {
  try {
    const args = process.argv.splice(2);
    // if requested, provide help and exit asap
    const needsHelp =
      !args.length || args.includes("-h") || args.includes("--help");
    if (needsHelp) help(getUsageMessage());

    // parse CLI arguments for option flags
    const options = parseOptions(args);

    // path can be the first cli argument or an option flag
    const path = !args[0].startsWith("-")
      ? args[0]
      : options["p"] || options["path"];

    if (!path) help("Error: The path to the build directory is required.");

    const loader = options["l"] || options["loader"];
    loader && toggleLoadingAnimation();

    const binary = options["b"] || options["binary"]; // undefined is falsy
    const outfile = options["o"] || options["outfile"];

    // set options parsed by flag, otherwise use defaults
    const type =
      options["f"] || options["filetype"] || FLAG_INFO["filetype"].default;
    const decimals =
      options["d"] || options["decimals"] || FLAG_INFO["decimals"].default;

    const buildSizes = await getBuildSizes(path, type);

    // save build sizes if outfile is provided
    if (outfile) saveBuildSizes(buildSizes, outfile);
    const {
      mainBundleName,
      mainBundleSize,
      mainBundleSizeGzip,
      mainBundleSizeBrotli,
      buildSize,
      buildSizeOnDisk,
      buildFileCount,
    } = buildSizes;

    // build sizes bytes in human readable format
    const buildSizeFormatted = formatBytes(buildSize, decimals, binary);
    const buildOnDiskFormatted = formatBytes(buildSizeOnDisk, decimals, binary);
    const bundleSizeFormatted = formatBytes(mainBundleSize, decimals, binary);
    const gzipFormatted = formatBytes(mainBundleSizeGzip, decimals, binary);
    const brotliFormatted = formatBytes(mainBundleSizeBrotli, decimals, binary);

    // remove loading animation
    loader && toggleLoadingAnimation();

    // make logs look noice
    const title = "|> Application Build Sizes <|";
    const line = "-".repeat(title.length);
    const bundle = `Main ${type.toUpperCase()} bundle`;

    // gets build size unit by determining char length
    // byte (B) is 1 char and the rest are 2 (KB, MB, etc.)
    const sizeUnit = (size) =>
      size.slice(-size.match(/\s+\S*$/)[0].trim().length);

    // This code smells like a brown bag full of glue
    // It's staying
    console.log(
      `\n${line}\n${title}\n${line}`,
      `\n${underline("Build")}`,
      "\n --> file count:",
      buildFileCount,
      "\n --> size:",
      // for number syntax highlighting
      Number(buildSizeFormatted.slice(0, -2)),
      sizeUnit(buildSizeFormatted),
      // on disk size uses the unix du command, which is not supported on Windows
      buildSizeOnDisk ? "\n --> size on disk:" : "",
      buildSizeOnDisk ? Number(buildOnDiskFormatted.slice(0, -2)) : "",
      buildSizeOnDisk ? sizeUnit(buildOnDiskFormatted) : "",
      `\n${line}`,
      `\n${underline(bundle)}`,
      "\n --> name:",
      mainBundleName,
      "\n --> size:",
      Number(bundleSizeFormatted.slice(0, -2)),
      sizeUnit(bundleSizeFormatted),
      "\n --> gzip size:",
      Number(gzipFormatted.slice(0, -2)),
      sizeUnit(gzipFormatted),
      "\n --> brotli size:",
      Number(brotliFormatted.slice(0, -2)),
      sizeUnit(brotliFormatted),
      `\n${line}\n`,
    );
  } catch (err) {
    help(err);
  }
})();

/**
 * Parse CLI arguments for option flags.
 *
 * @private
 * @param {Array<string>} args - command line arguments from node
 * @returns {Object.<string>} - flags (as keys) and their values
 */
function parseOptions(args) {
  const options = {};
  args.forEach((arg) => {
    if (arg.startsWith("-")) {
      const option = arg.split("=");
      // remove all leading dashes
      const flag = option[0].replace(/^-*/, "");
      // assumes flag is boolean if there is no value specified
      const value = option.length > 1 ? option[1] : true;
      options[flag] = value;
    }
  });
  return options;
}

/**
 * Format the flag options and create the usage message.
 *
 * @private
 * @since v3.0.0
 * @returns CLI help message
 * */
function getUsageMessage() {
  // parse options help message from FLAG_INFO object
  const req = (flag) => (FLAG_INFO[flag].required ? "[required]" : "");
  const bool = (flag) => (FLAG_INFO[flag].boolean ? "[boolean]" : "");
  const def = (flag) =>
    FLAG_INFO[flag].default ? `(default is ${FLAG_INFO[flag].default})` : "";

  // format the option info
  const options = Object.keys(FLAG_INFO)
    .map(
      (f) =>
        `  -${f.charAt(0)}, --${f} ${req(f)} ${bool(f)}
      ${FLAG_INFO[f].description} ${def(f)}`,
    )
    .join("\n\n");

  return `
A small script that provides build sizes to assist with optimization.

USAGE
  build-sizes <path> [options]

REPOSITORY
  https://github.com/benelan/build-sizes

ARGUMENTS
  path [required]
      Path to the build directory

OPTIONS
${options}

EXAMPLES
  # simplest usage with sane defaults
  build-sizes dist

  # size of the largest css file with tweaked number formatting
  build-sizes dist --filetype=css --binary --decimals=1

  # same as above, but use a flag for path when it's not the first argument
  build-sizes -f=css -b -d=1 -p=dist

  # save the build sizes to a csv and display a loading animation
  build-sizes dist --loader --outfile=data/build-sizes.csv`;
}
