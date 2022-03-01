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

## Using the CLI

To run the script, you need to provide the path (absolute or relative) to the application's build directory. For example, `create-react-app` generates a directory named `build` for production (other common names include `dist` and `public`). Once the application is built, you can get the sizes by running the following from the application's root directory:

```bash
build-sizes build
```

And the output to the console is:

```
-----------------------------
|> Application Build Sizes <|
-----------------------------
Build
 --> file count: 419
 --> size: 27.73 MB
-----------------------------
Main JS bundle
 --> name: main.6e924e92.js
 --> size: 1.70 MB
 --> gzip size: 462.92 KB
 --> brotli size: 375.26 KB
-----------------------------
```

There are also options that you can provide with flags. For example, you can specify a filetype for the largest bundle size (default is "js"):

```bash
build-sizes build --filetype=css
```

Providing the `-h` or `--help` flag will log usage information to the console, copy/pasted here for convenience:

<details>

### Arguments

**path [required]**

- Path to the build directory

### Options

**-b, --binary [boolean]**

- Convert bytes to human readable format in base 2 instead of base 10

**-d, --decimals**

- Number of decimal places for rounding bytes to a human readable format (default is 2)

**-f, --filetype**

- Filetype of the main bundle (default is js)

**-o, --outfile**

- Path to a file for saving build sizes as CSV data

**-p, --path [required]**

- Path to the build directory (also available as argument)

### Examples

`build-sizes dist`

- Simplest usage with sane defaults

`build-sizes dist --filetype=css --binary --decimals=1`

- Size of the largest css file with tweaked number formatting

`build-sizes -f=css -b -d=1 -p=dist`

- Same as above, but use a flag for path when it's not the first argument

`build-sizes dist --outfile=data/build-sizes.csv`

- Save the build sizes to a csv

</details>

### Running from an npm script

Pro tip: you can get the sizes after every build by adding a `postbuild` npm script:

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

## Using the functions

The package also exports functions, [documented here](https://benelan.github.io/build-sizes/global.html). They are available as both CommonJS and ECMAScript modules. Check out the [CLI code](https://github.com/benelan/build-sizes/blob/master/src/cli.js) for a simple usage example that logs build sizes to the console. Here is another usage example that saves your project's build sizes, version, and a timestamp to a CSV file.

```js
import { appendFile, readFile, writeFile } from "fs/promises";
import { getBuildSizes } from "build-sizes";

const ARGUMENT_ERROR = `Two required arguments (in order):
    - path to the build directory
    - path of the output csv file`;

(async () => {
  try {
    const [build, outfile] = process.argv.splice(2);
    if (!build || !outfile) throw new Error(ARGUMENT_ERROR);

    const sizes = await getBuildSizes(build);
    const version = JSON.parse(await readFile("package.json", "utf8")).version;

    // convert build-sizes output into csv header and row
    const header = ["Version", "Timestamp", ...Object.keys(sizes)]
      .join(",")
      .concat("\n");

    const row = [version, Date.now(), ...Object.values(sizes)]
      .join(",")
      .concat("\n");

    try {
      // write csv header if outfile doesn't exist
      await writeFile(outfile, header, { flag: "wx" });
    } catch (err) {
      // don't throw error if outfile does exists
      if (err.code !== "EEXIST") {
        throw new Error(err);
      }
    }
    // append build size info to csv
    await appendFile(outfile, row);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
```

You can use the example by providing the paths to the build directory and output CSV file:

```bash
node save.js dist sizes.csv
```

You could even add it as a `postpublish` script to keep track of your build sizes for each release! As a matter of fact, scratch that I'm adding it to the package 🚀

```diff
 "scripts": {
    "publish": "... && npm publish",
+   "postpublish": "build-sizes dist -o=sizes.csv",
    ...
```

The `saveBuildSizes` function is also exported, so you can use it in your scripts!

> **Note:** The save script requires the current working directory to contain `package.json`, so it can read the project's version number. Adding it as an npm script is recommended so you can call it from any of the project's directories.
