#!/usr/bin/env node
import { resolve } from "path";
import { readdir, stat, readFile } from "fs/promises";
import { promisify } from "util";
import { exec } from "child_process";
import { gzip, brotliCompress } from "zlib";
const compressGzip = promisify(gzip);
const compressBrotli = promisify(brotliCompress);
const execBash = promisify(exec);

/**
 * Returns all files in a directory (recursive).
 * @since v2.1.0
 * @param {string} directoryPath - path to the directory containing the files
 * @returns {Promise<File[]>} all files in the directory and subdirectories
 */
const getFiles = async (directoryPath) => {
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
};

/**
 * Formats bytes to a human readable size.
 * @since v2.1.0
 * @param {number} bytes - bytes to format
 * @param {number} [decimals=2] - decimal precision for rounding
 * @param {boolean} [binary=true] - binary or decimal conversion
 * @returns {string} human readable file size with units
 */
const formatBytes = (bytes, decimals = 2, binary = true) => {
  if (!bytes) return "0 B";

  const unitSizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const k = binary ? 1024 : 1000; // binary vs decimal conversion
  const d = !decimals || decimals < 0 ? 0 : decimals; // no negative decimal precision
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(d))} ${unitSizes[i]}`;
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
 * Gets file sizes in bytes. Use {@link getFiles} to retrieve your build files.
 * @since v2.2.0
 * @deprecated {@link File} now has a size property
 * @param {File[]} files - files to measure
 * @returns {Promise<File[]>} sizes of the files in bytes
 */
const getFileSizes = async (files) =>
  await Promise.all(files.map(async (file) => (await stat(file.path)).size));

/**
 * Compresses a file using gzip and returns the size (no write)
 * @since v2.5.0
 * @param {string} filePath - path of the file to compress
 * @returns {Promise<number>} file size compressed using gzip with the default [zlib]{@link https://nodejs.org/api/zlib.html#class-options} options
 */
const getFileSizeGzip = (filePath) =>
  readFile(filePath)
    .then(compressGzip)
    .then((output) => output.length)
    .catch((e) => console.error(e));

/**
 * Compresses a file using brotli and returns the size (no write)
 * @since v2.5.0
 * @param {string} filePath - path of the file to compress
 * @returns {Promise<number>} file size compressed using brotli with the default [zlib]{@link https://nodejs.org/api/zlib.html#brotli-constants} options
 */
const getFileSizeBrotli = (filePath) =>
  readFile(filePath)
    .then(compressBrotli)
    .then((output) => output.length)
    .catch((e) => console.error(e));

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
    const mainBundleName = mainBundleFile.name;
    // the largest file size by type
    const mainBundleSize = mainBundleFile ? mainBundleFile.size : 0;

    // main bundle size compressed using gzip and brotli
    const mainBundleSizeGzip = await getFileSizeGzip(mainBundleFile.path);
    const mainBundleSizeBrotli = await getFileSizeBrotli(mainBundleFile.path);

    // sum of all file sizes
    const buildSize = buildFiles.reduce((count, file) => count + file.size, 0);

    // the du command is not available on windows
    const buildSizeOnDisk =
      process.platform !== "win32"
        ? Number((await execBash(`du -sb ${build} | cut -f1`)).stdout.trim())
        : NaN;

    console.log(buildSizeOnDisk);
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
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
};

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
 * The primary output of the script.
 * @typedef {Object} BuildSizes
 * @property {string} mainBundleName - bane if the largest bundle size by type
 * @property {number} mainBundleSize - size in bytes of the largest bundle file by type
 * @property {number} mainBundleSizeGzip - size in bytes of the main bundle file compressed with gzip
 * @property {number} mainBundleSizeBrotli - size in bytes of the main bundle file  compressed with brotli
 * @property {number} buildSize - size in bytes of all files in the build directory
 * @property {number} buildSizeOnDisk -  on-disk size in bytes of the build directory. Not available on Windows.
 * @property {number} buildFileCount - count of all files in the build directory
 * @see {@link getBuildSizes}
 */

export {
  getBuildSizes,
  formatBytes,
  getFiles,
  getFileSizes,
  getFileSizeGzip,
  getFileSizeBrotli,
  filterFilesByType,
};
