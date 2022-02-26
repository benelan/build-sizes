#!/usr/bin/env node
import { appendFile, readFile, writeFile } from "fs/promises";
import { getBuildSizes } from "./index.js";

const ARGUMENT_ERROR = `Two required arguments (in order):
- path to the build directory
- path of the output csv file`;

(async () => {
  try {
    // check cli arguments
    const [buildPath, outputPath] = process.argv.splice(2);
    if (!buildPath || !outputPath) throw new Error(ARGUMENT_ERROR);

    // get projects's build sizes and version number
    const sizes = await getBuildSizes(buildPath);
    const version = JSON.parse(await readFile("package.json", "utf8")).version;
    const timestamp = new Intl.DateTimeFormat("default", {
      dateStyle: "short",
      timeStyle: "long",
    })
      .format(Date.now())
      .replace(",", " at");

    // convert build-sizes output into csv header and row
    const header = ["Timestamp", "Version", ...Object.keys(sizes)]
      .join(",")
      .concat("\n");
    const row = [timestamp, version, ...Object.values(sizes)]
      .join(",")
      .concat("\n");

    // write header if output file doesn't exist (errors if it does)
    await writeFile(outputPath, header, { flag: "wx" });
    // append build size info to csv
    await appendFile(outputPath, row);
  } catch (e) {
    // don't catch error from writeFile if output file exists
    if (e.code !== "EEXIST") {
      console.error(e);
      process.exitCode = 1;
    }
  }
})();
