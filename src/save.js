#!/usr/bin/env node
import { appendFile, readFile, writeFile } from "fs/promises";
import { getBuildSizes } from "./index.js";

(async () => {
  try {
    const [buildPath, outputPath] = process.argv.splice(2);
    if (!buildPath) throw new Error("Provide the path to the build directory");
    if (!outputPath) throw new Error("Provide the path of the output csv file");

    const sizes = await getBuildSizes(buildPath);
    // get projects's version number
    const version = JSON.parse(await readFile("package.json", "utf8")).version;

    const header = ["Timestamp", "Version", ...Object.keys(sizes)]
      .join(",")
      .concat("\n");

    const row = [Date.now(), version, ...Object.values(sizes)]
      .join(",")
      .concat("\n");

    try {
      // write csv header if file doesn't exist
      await writeFile(outputPath, header, { flag: "wx" });
    } catch (e) {
      if (e.code !== "EEXIST") {
        // don't throw error if file does exists
        throw new Error(e);
      }
    }
    await appendFile(outputPath, row);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
})();
