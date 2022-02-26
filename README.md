# Build sizes

A small script that provides build sizes to assist with optimization.

<br>
<div align="center">
    <b>🚀 Zero dependencies! 🚀</b>
</div>

## Installation

Install [the package](https://www.npmjs.com/package/build-sizes) globally and use it anywhere:

```bash
npm i -g build-sizes
```

Use it in a single application:

```bash
npm i -D build-sizes
```

Or try it out before installing:

```bash
npx build-sizes your/build/directory
```

## Usage

To run the script, you need to provide the path to the application's build directory. For example, `create-react-app` generates a directory named `build` for production. Once the application is built, you can get the sizes by running the following from the application's root directory:

```bash
build-sizes build
```

And the output to the console is:

```
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
|> Application Build Sizes <|
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 Build
 --> total size: 2.06 MB
 --> file count: 2389
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 Main JS bundle
 --> name: main.916a6715.js
 --> size: 268.61 KB
 --> gzip size: 71.45 KB
 --> brotli size: 61.01 KB
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
```

You can also specify a filetype for the main (largest) bundle size. The default is `js`.

```bash
build-sizes build css
```

Other common directory names used by frameworks for production builds are `dist` and `public`.

### Running from an NPM script

You can get the sizes after every build by adding a `postbuild` NPM script:

```diff
 "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
+   "postbuild": "build-sizes build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
...
```

The sizes will be logged to the console after running `npm run build`.

### Using the functions

The package also exports functions, [documented here](https://benelan.github.io/build-sizes/global.html). They are available as both CommonJS and ECMAScript modules. Check out the [CLI code](https://github.com/benelan/build-sizes/blob/master/src/cli.js) for a simple usage example that logs build sizes to the console. Here is another usage example that saves your project's build sizes, version, and a timestamp to a CSV file.

```js
// save-build-sizes.js
import { appendFile, readFile, writeFile } from "fs/promises";
import { getBuildSizes } from "build-sizes";

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

    // convert build-sizes output into csv header and row
    const header = ["Timestamp", "Version", ...Object.keys(sizes)]
      .join(",")
      .concat("\n");
    const row = [Date.now(), version, ...Object.values(sizes)]
      .join(",")
      .concat("\n");

    // write header if output file doesn't exist (errors if it does)
    await writeFile(outputPath, header, { flag: "wx" });
    // append build size info to csv
    await appendFile(outputPath, row);
  } catch (err) {
    // don't catch error from writeFile if output file exists
    if (err.code !== "EEXIST") {
      console.error(err);
      process.exitCode = 1;
    }
  }
})();
```

You can use the example by providing the paths to the build directory and output CSV file.

```bash
node save-build-sizes.js dist .build-sizes.csv
```

You could even add it as a `postpublish` script to keep track of your build sizes for each release! 🚀
