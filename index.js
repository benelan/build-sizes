#!/usr/bin/env node
const { resolve } = require("path");
const {
  promises: { readdir, stat },
} = require("fs");

/**
 * Returns all files in a directory (recursively)
 * @param {string} directoryPath - path to the build directory
 * @returns {Promise<{path: string, name: string}[]>} file path and name
 */
const getFiles = async (directoryPath) => {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files = entries
    .filter((file) => !file.isDirectory())
    .map((file) => ({ ...file, path: resolve(directoryPath, file.name) }));
  const directories = entries.filter((folder) => folder.isDirectory());

  for (const directory of directories) {
    const subdirectoryFiles = await getFiles(
      resolve(directoryPath, directory.name)
    );
    files.push(...subdirectoryFiles);
  }
  return files;
};

/**
 * Formats bytes to a human readable size
 * @param {number} bytes - the byte file size to convert
 * @param {number} [decimals=2] - number of decimal points to round
 * @param {boolean} [binary=true] - binary or decimal conversion
 * @returns human readable file size with units
 */

const formatBytes = (bytes, decimals = 2, binary = true) => {
  if (bytes === 0) return "0 Bytes";

  const unitSizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const k = binary ? 1024 : 1000; // binary vs decimal conversion
  const d = decimals < 0 ? 0 : decimals;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(d))} ${unitSizes[i]}`;
};

/**
 * Provides sizes for an application's production build
 * @param {string} buildPath - path from the current working directory to the build directory
 * @returns {Promise<{ mainBundleSize: number, buildSize:number, buildFileCount: number}>}
 * - mainBundleSize - size in bytes of the largest JavaScript bundle file
 * - buildSize - size in bytes of all files in the build directory
 * - buildFileCount - count of all files in the build directory
 */
const getBuildSizes = async (buildPath) => {
  const build = resolve(process.cwd(), buildPath);

  const buildFiles = await getFiles(build);

  const mainBundleSize = Math.max(
    ...(await Promise.all(
      buildFiles
        .filter((file) => /.js$/.test(file.name))
        .map(async (file) => (await stat(file.path)).size)
    ))
  );

  const buildSize = (
    await Promise.all(
      buildFiles.map(async (file) => (await stat(file.path)).size)
    )
  ).reduce((count, fileSize) => count + fileSize, 0);

  const buildFileCount = buildFiles.length;

  return { mainBundleSize, buildSize, buildFileCount };
};

module.exports = { getBuildSizes, getFiles, formatBytes };
