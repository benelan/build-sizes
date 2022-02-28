#!/usr/bin/env node
import { getBuildSizes, saveBuildSizes, formatBytes, help } from "./index.js";

const FLAG_INFO = {
  binary: {
    description:
      "Convert bytes to human readable format in base 2 instead of base 10",
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

let loadingInterval; // loading animation interval

(async () => {
  try {
    toggleLoadingAnimation();
    const args = process.argv.splice(2);
    // if requested, provide help and exit asap
    if (!args.length || args.includes("-h") || args.includes("--help")) {
      help(getUsageMessage());
    }
    // parse CLI arguments for option flags
    const options = parseOptions(args);

    // path can be the first cli argument or an option
    const path = !args[0].startsWith("-")
      ? args[0]
      : options["p"] || options["path"];

    if (!path) help("Error: The path to the build directory is required.");

    // set options parsed by flag, otherwise use defaults
    const type =
      options["f"] || options["filetype"] || FLAG_INFO["filetype"].default;
    const decimals =
      options["d"] || options["decimals"] || FLAG_INFO["decimals"].default;
    const binary =
      options["b"] || options["binary"] || FLAG_INFO["binary"].default;
    const outfile = options["o"] || options["outfile"]; // no default

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

    // build size bytes in human readable format
    const buildSizeFormatted = formatBytes(buildSize, decimals, binary);
    const buildOnDiskFormatted = formatBytes(buildSizeOnDisk, decimals, binary);
    const bundleSizeFormatted = formatBytes(mainBundleSize, decimals, binary);
    const gzipFormatted = formatBytes(mainBundleSizeGzip, decimals, binary);
    const brotliFormatted = formatBytes(mainBundleSizeBrotli, decimals, binary);

    // remove loading animation
    toggleLoadingAnimation();

    // make logs look noice
    const title = "|> Application Build Sizes <|";
    const line = "-".repeat(title.length);
    const bundle = `Main ${type.toUpperCase()} bundle`;
    // bold and underline text using ansi codes
    const boldUnderline = (text) => `\u001b[1m\x1b[4m${text}\x1b[0m`;

    console.log(
      `\n${line}\n${title}\n${line}`,
      `\n${boldUnderline("Build")}`,
      "\n --> file count:",
      buildFileCount,
      "\n --> size:",
      // for number syntax highlighting
      Number(buildSizeFormatted.slice(0, -3)),
      buildSizeFormatted.slice(-2),
      // on disk size uses the unix du command
      // which is not supported on Windows
      buildSizeOnDisk ? "\n --> on-disk size:" : "",
      buildSizeOnDisk ? Number(buildOnDiskFormatted.slice(0, -3)) : "",
      buildSizeOnDisk ? buildOnDiskFormatted.slice(-2) : "",
      `\n${line}`,
      `\n${boldUnderline(bundle)}`,
      `\n --> name:`,
      mainBundleName,
      `\n --> size:`,
      Number(bundleSizeFormatted.slice(0, -3)),
      bundleSizeFormatted.slice(-2),
      `\n --> gzip size:`,
      Number(gzipFormatted.slice(0, -3)),
      gzipFormatted.slice(-2),
      `\n --> brotli size:`,
      Number(brotliFormatted.slice(0, -3)),
      brotliFormatted.slice(-2),
      `\n${line}\n`
    );
  } catch (err) {
    help(err);
  }
})();

/**
 * Parses CLI arguments for option flags
 * @param {Array<string>} args - CLI arguments from node
 * @returns {Object.<string>} Dictionary of options and their corresponding values
 */
function parseOptions(args) {
  const options = {};
  args.forEach((arg) => {
    if (arg.startsWith("-")) {
      const option = arg.split("=");
      // remove all leading dashes
      const flag = option[0].replace(/^-*/, "");
      // if there is no value then it is treated as a boolean flag
      // this could use some error handling eventually
      const value = option.length > 1 ? option[1] : true;
      options[flag] = value;
    }
  });
  return options;
}

/**
 * Uses ANSI Codes to creates an animation interval on the first run.
 * Clears the interval on any subsequent executions.
 * @private
 * @since v3.1.0
 */
function toggleLoadingAnimation() {
  if (!loadingInterval) {
    // clear interval for all exit types
    [
      `exit`,
      `SIGINT`,
      `SIGUSR1`,
      `SIGUSR2`,
      `uncaughtException`,
      `SIGTERM`,
    ].forEach((event) => {
      process.once(event, toggleLoadingAnimation);
    });
    // hide cursor
    process.stdout.write("\u001B[?25l\r");
    let count = 0;
    loadingInterval = setInterval(() => {
      if (count % 11 === 0)
        // reset animation: delete line, send cursor to start, add emoji
        process.stdout.write(`\u001B[2K\r${["🔨 ", "📏 "][count % 2]}`);
      // add the ... animation
      else process.stdout.write(".");
      count += 1;
    }, 100);
  } else {
    clearInterval(loadingInterval);
    // show cursor and delete loading icons
    process.stdout.write(`\u001B[2K\r\u001B[?25h`);
  }
}

/**
 * Parses the FLAG_INFO object for
 * options and creates the usage message
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
     ${FLAG_INFO[f].description} ${def(f)}`
    )
    .join("\n\n");

  return `A small script that provides build sizes to assist with optimization

Usage: build-sizes <path> [options]

Repository
  https://github.com/benelan/build-sizes

Arguments
  path [required]
     Path to the build directory

Options
${options}

Examples
  # simplest usage with sane defaults
  build-sizes dist

  # size of the largest css file with tweaked the number formatting
  build-sizes dist --filetype=css --binary --decimals=1

  # same as above, but use a flag for path when it's not the first argument
  build-sizes -f=css -b -d=1 -p=dist

  # save the build sizes to a csv
  build-sizes dist --outfile=data/build-sizes.csv`;
}
