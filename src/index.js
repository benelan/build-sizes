#!/usr/bin/env node
import { resolve } from "node:path";
import {
  readdir,
  stat,
  readFile,
  appendFile,
  writeFile,
} from "node:fs/promises";
import { promisify } from "node:util";
import { exec as execSync } from "node:child_process";
import {
  gzip as gzipSync,
  brotliCompress as brotliCompressSync,
} from "node:zlib";

const exec = promisify(execSync);
const gzip = promisify(gzipSync);
const brotliCompress = promisify(brotliCompressSync);

/**
 * Format bytes to a human readable size.
 *
 * @since v2.1.0
 * @param {number} bytes - The bytes to format.
 * @param {number} [decimals] - The decimal precision for rounding.
 * @param {boolean} [binary] - The binary or decimal unit conversion.
 * @returns {string} The human readable file size with units.
 */
function formatBytes(bytes, decimals = 2, binary = false) {
  try {
    if (!bytes) {
      return "0 B";
    }

    const k = binary ? 1024 : 1000;
    const n = Math.floor(
      binary ? Math.log10(bytes) / 3 : Math.log2(bytes) / 10,
    );

    // I prefer human readable sizes, don't like it? byte me!
    const value = (bytes / Math.pow(k, n)).toFixed(decimals);
    const unit = `${"KMGTPEZY"[n - 1] || ""}B`;
    return `${value} ${unit}`;
  } catch (err) {
    help(
      err,
      "\n\nOccurred while formatting bytes. Double check the inputs:",
      "\n    bytes:",
      bytes,
      "\n    decimals:",
      decimals,
      "\n    binary:",
      binary,
    );
  }
}

/**
 * Asynchronously retrieves all files from a specified directory and its subdirectories.
 *
 * @since v2.1.0
 * @param {string} parentDir - The path to the parent directory to search for files.
 * @returns {Promise<Array<File[]>} A promise that resolves to an array of file objects, each containing the file's name, path, and size.
 * @throws Will throw an error if the directory cannot be read or if any other error occurs during the file retrieval process.
 */
async function getFiles(parentDir) {
  try {
    const files = [];
    const entries = await readdir(parentDir, {
      withFileTypes: true,
      recursive: true,
    });

    for (const dirent of entries) {
      if (dirent.isFile()) {
        const itemPath = resolve(dirent.path, dirent.name);
        const { size } = await stat(itemPath);
        files.push({ name: dirent.name, path: itemPath, size });
      }
    }

    return Promise.all(files);
  } catch (err) {
    if (err.code === "ENOENT") {
      help("Error: Could not find build at specified path:\n   ", parentDir);
    } else {
      help(
        err,
        "\n\nOccurred while finding build files.",
        "Double check the file path:\n   ",
        parentDir,
      );
    }
  }
}

/**
 * Filter files by filetype. Use {@link getFiles} to retrieve the build files.
 *
 * @since v2.2.0
 * @param {File[]} files - The files to filter.
 * @param {string} type - The file type, e.g. "js", "css", etc.
 * @returns {File[]} The files filtered by file type.
 */
const filterFilesByType = (files, type) =>
  files.filter((file) => new RegExp(`.${type}$`, "i").test(file.name));

/**
 * Compress a file using gzip and return the size.
 *
 * @since v3.0.0
 * @param {string} filePath - The path of the file to compress.
 * @returns {Promise<number>} The gzip-compressed byte size using the default.
 *   [zlib]{@link https://nodejs.org/api/zlib.html#brotli-constants} options
 */
const getFileSizeGzip = (filePath) =>
  readFile(filePath)
    .then(gzip)
    .then((output) => output.length)
    .catch((err) =>
      help(
        err,
        "\n\nOccurred while getting gzipped file size.",
        "Double check the file path:\n   ",
        filePath,
      ),
    );

/**
 * Compress a file using brotli and return the size.
 *
 * @since v3.0.0
 * @param {string} filePath - The path of the file to compress.
 * @returns {Promise<number>} The brotli-compressed byte size using the default.
 *   [zlib]{@link https://nodejs.org/api/zlib.html#brotli-constants} options
 */
const getFileSizeBrotli = (filePath) =>
  readFile(filePath)
    .then(brotliCompress)
    .then((output) => output.length)
    .catch((err) =>
      help(
        err,
        "\n\nOccurred while getting brotli compressed file size.",
        "Double check the file path:\n   ",
        filePath,
      ),
    );

/**
 * Determine metrics related to an application's build size.
 *
 * @param {string} buildPath - The path to the build directory.
 * @param {string} [bundleFileType] - The file type of bundle, e.g. "js", "css", etc.
 * @returns {Promise<BuildSizes>} The build sizes.
 */
async function getBuildSizes(buildPath, bundleFileType = "js") {
  try {
    const build = resolve(process.cwd(), buildPath);
    const buildFiles = await getFiles(build);
    const filteredBuildFiles = filterFilesByType(buildFiles, bundleFileType);

    // the file with the largest size by type
    const mainBundleFile = filteredBuildFiles.length
      ? filteredBuildFiles.reduce((max, file) =>
          max.size > file.size ? max : file,
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

    // the `du` command is not available on windows
    const buildSizeOnDisk =
      process.platform !== "win32"
        ? Number((await exec(`du -sb ${build} | cut -f1`)).stdout.trim())
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
      bundleFileType,
    );
  }
}

/**
 * Save the results from {@link getBuildSizes} to a CSV file. Useful for
 * tracking build sizes over time, e.g., in a CI/CD pipeline.
 *
 * @since v3.0.0
 * @param {BuildSizes} buildSizes - The build sizes that will be saved to CSV.
 * @param {string} outputPath - The path of the output file, e.g. "build/size.csv".
 */
async function saveBuildSizes(buildSizes, outputPath) {
  try {
    const outfile = resolve(outputPath);
    let version = "";

    try {
      version = JSON.parse(await readFile("package.json", "utf8")).version;
    } catch (err) {
      if (err.code === "ENOENT" && err.path === "package.json") {
        console.warn(
          "No package.json file found in the current working directory.",
          "The package version will not be specified.\n",
        );
      }
    }

    const timestamp = new Intl.DateTimeFormat("default", {
      dateStyle: "short",
      timeStyle: "long",
    })
      .format(Date.now())
      .replace(",", " at");

    const header = [version ? "Version," : "", "Timestamp"];
    const row = [version ? `${version},` : "", timestamp];

    for (const [key, value] of Object.entries(buildSizes)) {
      header.push(key);
      row.push(value);
    }

    header.push("(File sizes in bytes)");
    const headerString = `${header.join(",")}\n`;

    try {
      // write csv header if outfile doesn't exist
      await writeFile(outfile, headerString, { flag: "wx" });
    } catch (err) {
      // don't throw error if outfile does exists
      if (err.code !== "EEXIST") {
        help(
          err,
          "\n\nOccurred while saving build sizes.",
          "Double check the output path:\n   ",
          resolve(outputPath),
        );
      }
    }

    // append build size info to csv
    const rowString = `${row.join(",")}\n`;
    await appendFile(outfile, rowString);
  } catch (err) {
    help(err, "\n\nError saving build sizes to CSV.");
  }
}

/**
 * Print a help message to stderr and exit with code 1.
 *
 * @private
 * @since v3.0.0
 * @param  {...any} messages - The info to print to stderr.
 */
function help(...messages) {
  messages && console.error(...messages);
  console.error(
    "\nAdd the -h or --help flag for usage information when on the CLI.\n",
    "\nRead the documentation for assistance with the exported functions:",
    "\nhttps://benelan.github.io/build-sizes/global.html",
  );
  process.exit(1);
}

/**
 * Information about a file.
 *
 * @typedef {object} File
 * @property {string} name - The file name with type.
 * @property {string} path - The absolute file path.
 * @property {string} size - The uncompressed file size.
 * @see {@link getFiles}
 * @see {@link getFileSizeBrotli}
 * @see {@link getFileSizeGzip}
 * @see {@link filterFilesByType}
 */

/**
 * Information about an application's build sizes.
 *
 * @typedef {object} BuildSizes
 * @property {string} mainBundleName - The name of the largest bundle size by type.
 * @property {number} mainBundleSize - The byte size of the largest bundle file by type.
 * @property {number} mainBundleSizeGzip - The gzip-compressed byte size of the main bundle file.
 * @property {number} mainBundleSizeBrotli - The brotli-compressed byte size of the main bundle file.
 * @property {number} buildSize - The byte size of all files in the build directory.
 * @property {number} buildSizeOnDisk - The on-disk size in bytes of the build directory. Not available on Windows.
 * @property {number} buildFileCount - The count of all files in the build directory.
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
