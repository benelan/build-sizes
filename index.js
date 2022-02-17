#!/usr/bin/env node
const { resolve } = require("path");
const {
  promises: { readdir, stat },
} = require("fs");

/**
 * Returns all files in a directory (recursively)
 * @param {string} buildPath - path to the build directory
 * @returns {Promise<{path: string, name: string}>} file path and name
 */
const getFiles = async (buildPath) => {
  const entries = await readdir(buildPath, { withFileTypes: true });
  const files = entries
    .filter((file) => !file.isDirectory())
    .map((file) => ({ ...file, path: resolve(buildPath, file.name) }));
  const directories = entries.filter((folder) => folder.isDirectory());

  for (const directory of directories) {
    const subdirectoryFiles = await getFiles(
      resolve(buildPath, directory.name)
    );
    files.push(...subdirectoryFiles);
  }
  return files;
};

/**
 * Converts bytes to a human readable format
 * @param {number} bytes - the byte file size to convert
 * @returns human readable file size
 */
const convertBytes = (bytes) => {
  const sizeUnits = ["Bytes", "KB", "MB", "GB", "TB"];

  if (bytes == 0) {
    return "n/a";
  }

  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));

  if (unitIndex == 0) {
    return `${bytes} ${sizeUnits[unitIndex]}`;
  }

  return `${(bytes / Math.pow(1024, unitIndex)).toFixed(2)} ${
    sizeUnits[unitIndex]
  }`;
};

/**
 * Provides sizes for an application's production build
 * @param {string} buildPath - path from the current working directory to the build directory
 * @returns {Promise<{ mainBundleSize: string, buildSize:string , buildFileCount: string}>}
 * - mainBundleSize - size in megabytes of the largest JavaScript bundle file
 * - buildSize - size in megabytes of all files in the build directory
 * - buildFileCount - count of all files in the build directory
 */
const getBuildSizes = async (buildPath) => {
  const build = resolve(process.cwd(), buildPath);

  const buildFiles = await getFiles(build);

  const mainBundleSize = convertBytes(
    Math.max(
      ...(await Promise.all(
        buildFiles
          .filter((file) => /.js$/.test(file.name))
          .map(async (file) => (await stat(file.path)).size)
      ))
    )
  );

  const buildSize = convertBytes(
    (
      await Promise.all(
        buildFiles.map(async (file) => (await stat(file.path)).size)
      )
    ).reduce((count, fileSize) => count + fileSize, 0)
  );

  const buildFileCount = buildFiles.length;

  return { mainBundleSize, buildSize, buildFileCount };
};

module.exports = { getBuildSizes };
