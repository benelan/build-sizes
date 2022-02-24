#!/usr/bin/env node
import { resolve } from "path";
import fs from "fs";
const {
  promises: { readdir, stat },
} = fs;

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
 * Provides sizes for an application's production build.
 * @param {string} buildPath - path to the build directory
 * @param {string} [bundleFileType="js"] - type of bundle files, e.g. "js", "css", etc.
 * @returns {Promise<BuildSizes>} build sizes
 */
const getBuildSizes = async (buildPath, bundleFileType = "js") => {
  const build = resolve(process.cwd(), buildPath);
  const buildFiles = await getFiles(build);
  const filteredBuildFiles = filterFilesByType(buildFiles, bundleFileType);

  // the file with the largest size by type
  const mainBundleFile = filteredBuildFiles.length
    ? filteredBuildFiles.reduce((max, file) => max.size > file.size ? max : file)
    : null;

  // the largest file size by type
  const mainBundleSize = mainBundleFile ? mainBundleFile.size : 0;
  const mainBundleName = mainBundleFile.name;
  // sum of all file sizes
  const buildSize = buildFiles.reduce((count, file) => count + file.size, 0);

  const buildFileCount = buildFiles.length;

  return { mainBundleName, mainBundleSize, buildSize, buildFileCount };
};

/**
 * Important information about a file.
 * @typedef {Object} File
 * @property {string} name - file name with type
 * @property {string} path - absolute file path
 * @property {string} size - uncompressed file size
 * @see {@link getFiles}
 * @see {@link getFileSizes}
 * @see {@link filterFilesByType}
 */

/**
 * The primary output of the script.
 * @typedef {Object} BuildSizes
 * @property {string} mainBundleName - bane if the largest bundle size by type
 * @property {number} mainBundleSize - size in bytes of the largest bundle file by type
 * @property {number} buildSize - size in bytes of all files in the build directory
 * @property {number} buildFileCount - count of all files in the build directory
 * @see {@link getBuildSizes}
 */

export {
  getBuildSizes,
  formatBytes,
  getFiles,
  getFileSizes,
  filterFilesByType,
};
