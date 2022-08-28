#!/usr/bin/env node
import { resolve } from "path";
import { readdir, stat, readFile, appendFile, writeFile } from "fs/promises";
import { promisify } from "util";
import { exec } from "child_process";
import { gzip, brotliCompress } from "zlib";
const compressGzip = promisify(gzip);
const compressBrotli = promisify(brotliCompress);
const execBash = promisify(exec);

/**
 * Formats bytes to a human readable size.
 * @since v2.1.0
 * @param {number} bytes - bytes to format
 * @param {number} [decimals=2] - decimal precision for rounding
 * @param {boolean} [binary=false] - binary or decimal unit conversion
 * @returns {string} human readable file size with units
 */
const formatBytes = (bytes, decimals = 2, binary = false) => {
  try {
    if (!bytes) return "0 B";
    const k = binary ? 1024 : 1000;
    const n = Math.floor(
      binary ? Math.log10(bytes) / 3 : Math.log2(bytes) / 10
    );
    // I prefer human readable sizes, don't like it? byte me!
    return `${(bytes / Math.pow(k, n)).toFixed(decimals)} ${
      "KMGTPEZY"[n - 1] || ""
    }B`;
  } catch (err) {
    help(
      err,
      "\n\nOccurred while formatting bytes. Double check the inputs:",
      "\n    bytes:",
      bytes,
      "\n    decimals:",
      decimals,
      "\n    binary:",
      binary
    );
  }
};

/**
 * Returns all files in a directory (recursive).
 * @since v2.1.0
 * @param {string} directoryPath - path to the directory containing the files
 * @returns {Promise<File[]>} all files in the directory and subdirectories
 */
const getFiles = async (directoryPath) => {
  try {
    const entries = await readdir(directoryPath, { withFileTypes: true });

    const files = entries
      .filter((file) => !file.isDirectory())
      .map(async ({ name }) => {
        const path = resolve(directoryPath, name);
        const { size } = await stat(path);
        return { name, path, size };
      });

    const directories = entries.filter((folder) => folder.isDirectory());
    for (const directory of directories) {
      // recursive calls for subdirectories
      const subdirectoryFiles = await getFiles(
        resolve(directoryPath, directory.name)
      );
      files.push(...subdirectoryFiles);
    }

    return Promise.all(files);
  } catch (err) {
    if (err.code === "ENOENT") {
      help(
        "Error: Could not find build at specified path:\n   ",
        directoryPath
      );
    } else {
      help(
        err,
        "\n\nOccurred while finding build files.",
        "Double check the file path:\n   ",
        directoryPath
      );
    }
  }
};

/**
 * Filters files by file type. Use {@link getFiles} to retrieve your build files.
 * @since v2.2.0
 * @param {File[]} files - files to filter
 * @param {string} type - file type, e.g. "js", "tsx", etc.
 * @returns {File[]} files filtered by file type
 */
const filterFilesByType = (files, type) =>
  files.filter((file) => new RegExp(`.${type}$`, "i").test(file.name));

/**
 * Compresses a file using gzip and returns the size (no write)
 * @since v3.0.0
 * @param {string} filePath - path of the file to compress
 * @returns {Promise<number>} file size compressed using gzip with the default [zlib]{@link https://nodejs.org/api/zlib.html#class-options} options
 */
const getFileSizeGzip = (filePath) =>
  readFile(filePath)
    .then(compressGzip)
    .then((output) => output.length)
    .catch((err) =>
      help(
        err,
        "\n\nOccurred while getting gzipped file size.",
        "Double check the file path:\n   ",
        filePath
      )
    );

/**
 * Compresses a file using brotli and returns the size (no write)
 * @since v3.0.0
 * @param {string} filePath - path of the file to compress
 * @returns {Promise<number>} file size compressed using brotli with the default [zlib]{@link https://nodejs.org/api/zlib.html#brotli-constants} options
 */
const getFileSizeBrotli = (filePath) =>
  readFile(filePath)
    .then(compressBrotli)
    .then((output) => output.length)
    .catch((err) =>
      help(
        err,
        "\n\nOccurred while getting brotli compressed file size.",
        "Double check the file path:\n   ",
        filePath
      )
    );

/**
 * Provides sizes for an application's production build.
 * @param {string} buildPath - path to the build directory
 * @param {string} [bundleFileType="js"] - type of bundle files, e.g. "js", "css", etc.
 * @returns {Promise<BuildSizes>} build sizes
 */
const getBuildSizes = async (buildPath, bundleFileType = "js") => {
  try {
    const build = resolve(process.cwd(), buildPath);
    const buildFiles = await getFiles(build);
    const filteredBuildFiles = filterFilesByType(buildFiles, bundleFileType);

    // the file with the largest size by type
    const mainBundleFile = filteredBuildFiles.length
      ? filteredBuildFiles.reduce((max, file) =>
        max.size > file.size ? max : file
      )
      : null;

    // the largest file size by type
    const mainBundleSize = mainBundleFile ? mainBundleFile.size : 0;
    const mainBundleName = mainBundleFile ? mainBundleFile.name : "Not found";

    // main bundle size compressed using gzip and brotli
    const mainBundleSizeGzip = mainBundleFile
      ? await getFileSizeGzip(mainBundleFile.path)
      : 0;
    const mainBundleSizeBrotli = mainBundleFile
      ? await getFileSizeBrotli(mainBundleFile.path)
      : 0;

    // sum of all file sizes
    const buildSize = buildFiles.reduce((count, file) => count + file.size, 0);

    // the du command is not available on windows
    const buildSizeOnDisk =
      process.platform !== "win32"
        ? Number((await execBash(`du -sb ${build} | cut -f1`)).stdout.trim())
        : NaN;

    const buildFileCount = buildFiles.length;

    return {
      mainBundleName,
      mainBundleSize,
      mainBundleSizeGzip,
      mainBundleSizeBrotli,
      buildSize,
      buildSizeOnDisk,
      buildFileCount,
    };
  } catch (err) {
    help(
      err,
      "\n\nOccurred while getting build sizes.",
      "Double check the inputs:",
      "\n    build path:",
      resolve(buildPath),
      "\n    bundle filetype:",
      bundleFileType
    );
  }
};

/**
 * Saves the build sizes from {@link getBuildSizes} to a CSV file. Useful for tracking sizes over time.
 * @since v3.0.0
 * @param {BuildSizes} buildSizes - build sizes that will be saved to CSV
 * @param {string} outputPath - the path to the output file, e.g. data/build-sizes.csv
 */
const saveBuildSizes = async (buildSizes, outputPath) => {
  try {
    const outfile = resolve(outputPath);
    let version = "";

    try {
      version = JSON.parse(await readFile("package.json", "utf8")).version;
    } catch (err) {
      if (err.code === "ENOENT" && err.path === "package.json")
        console.warn(
          "No package.json file found in the current working directory. The package version will not be specified.\n"
        );
    }

    const timestamp = new Intl.DateTimeFormat("default", {
      dateStyle: "short",
      timeStyle: "long",
    })
      .format(Date.now())
      .replace(",", " at");

    // convert build-sizes output into csv header and row
    const header = (version ? "Version," : "").concat(
      ["Timestamp", ...Object.keys(buildSizes), "(File sizes in bytes)"].join(
        ","
      ),
      "\n"
    );

    const row = (version ? version + "," : "").concat(
      [timestamp, ...Object.values(buildSizes)].join(","),
      "\n"
    );

    try {
      // write csv header if outfile doesn't exist
      await writeFile(outfile, header, { flag: "wx" });
    } catch (err) {
      // don't throw error if outfile does exists
      if (err.code !== "EEXIST") {
        help(
          err,
          "\n\nOccurred while saving build sizes.",
          "Double check the output path:\n   ",
          resolve(outputPath)
        );
      }
    }
    // append build size info to csv
    await appendFile(outfile, row);
  } catch (err) {
    help(err, "\n\nError saving build sizes to CSV.");
  }
};

/**
 * Prints help message to stderr, as well as any included parameters. Exits with code 1
 * @private
 * @since v3.0.0
 * @param  {...any} messages - info for stderr
 */
function help(...messages) {
  messages && console.error(...messages);
  console.error(
    "\nAdd the -h or --help flag for usage information when on the CLI.\n\nRead the documentation for assistance with the exported functions:\n  https://benelan.github.io/build-sizes/global.html\n"
  );
  process.exit(1);
}

/**
 * Important information about a file.
 * @typedef {Object} File
 * @property {string} name - file name with type
 * @property {string} path - absolute file path
 * @property {string} size - uncompressed file size
 * @see {@link getFiles}
 * @see {@link getFileSizeBrotli}
 * @see {@link getFileSizeGzip}
 * @see {@link filterFilesByType}
 */

/**
 * Information about a project's build sizes, primarily used for optimization.
 * @typedef {Object} BuildSizes
 * @property {string} mainBundleName - name of the largest bundle size by type
 * @property {number} mainBundleSize - size in bytes of the largest bundle file by type
 * @property {number} mainBundleSizeGzip - size in bytes of the main bundle file compressed with gzip
 * @property {number} mainBundleSizeBrotli - size in bytes of the main bundle file  compressed with brotli
 * @property {number} buildSize - size in bytes of all files in the build directory
 * @property {number} buildSizeOnDisk -  on-disk size in bytes of the build directory. Not available on Windows.
 * @property {number} buildFileCount - count of all files in the build directory
 * @see {@link getBuildSizes}
 * @see {@link saveBuildSizes}
 */

export {
  getBuildSizes,
  saveBuildSizes,
  formatBytes,
  getFiles,
  getFileSizeGzip,
  getFileSizeBrotli,
  filterFilesByType,
  help,
};
