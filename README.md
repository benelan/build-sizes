# Build sizes

A small script that provides build sizes to assist with optimization.

<br>
<div align="center">
    <b>🚀 Zero dependencies! 🚀</b>
</div>

## Installation

Install [the package](https://www.npmjs.com/package/build-sizes) globally and
use it anywhere:

```sh
npm i -g build-sizes
```

Use it in a single application:

```sh
npm i -D build-sizes
```

Or try it out before installing:

```sh
npx build-sizes your/build/directory
```

<br>

## Using the CLI

To run the script, you need to provide the path (absolute or relative) to the
application's build directory. For example, `create-react-app` generates a
directory named `build` for production (other common names include `dist` and
`public`). After building the application, you can get the sizes by running the
following from the application's root directory:

```sh
build-sizes build
```

And the output to the console is:

```sh
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

> **NOTE:** The "main bundle" file is naively chosen by largest file size, it
> doesn't use a dependency graph. This script is minimal by design, check out
> [`webpack-bundle-analyzer`](https://github.com/webpack-contrib/webpack-bundle-analyzer)
> for a more complex bundle size tool.

Flags are provided to change the default options. For example, you can specify a
filetype for the largest bundle size (default is "js"):

```sh
build-sizes dist --filetype=css
```

The argument parsing logic is very simple and requires the equals sign (`=`)
between the flag and its value. Additionally, short flags cannot be grouped
together into a single argument. Here are a couple examples of what will and
won't work:

```sh
# These two are incorrect
build-sizes dist -lb           # -l and -b flags combined into a single argument
build-sizes dist --decimals 4  # space between --decimals flag and its value

# This one is correct
build-sizes dist -l -b --decimals=4
```

The `-h` or `--help` flag will log usage information to the console, copy/pasted
here for convenience:

<details>
  <summary>Usage info</summary>

### Arguments

**path [required]**

- Path to the build directory

### Options

**-l, --loader [boolean]**

- Show a loading animation while determining the build size

**-b, --binary [boolean]**

- Convert bytes to human readable format in base 2 instead of base 10

**-d, --decimals**

- Number of decimal places for rounding bytes to a human readable format
  (default is 2)

**-f, --filetype**

- Filetype of the main bundle (default is js)

**-o, --outfile**

- Path to a file for saving build sizes as CSV data

**-p, --path [required]**

- Path to the build directory (also available as argument)

### Examples

- Simplest usage with sane defaults

  ```sh
  build-sizes dist
  ```

- Size of the largest css file with tweaked number formatting

  ```sh
  build-sizes dist --filetype=css --binary --decimals=1
  ```

- Same as above, but use a flag for path when it's not the first argument

  ```sh
  build-sizes -f=css -b -d=1 -p=dist
  ```

- Save the build sizes to a csv

  ```sh
  build-sizes dist --outfile=data/build-sizes.csv
  ```

</details>

<br>

### Running from an npm script

Pro tip: you can view the sizes after every build by adding a `postbuild` npm
script:

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

<br>

## Using the functions

The package also exports functions,
[documented here](https://benelan.github.io/build-sizes/global.html). They are
available as both CommonJS and ECMAScript modules. Check out the
[CLI code](https://github.com/benelan/build-sizes/blob/master/src/cli.js) for a
simple usage example that logs build sizes to the console. Here is another usage
example that saves your project's build sizes, version, and a timestamp to a CSV
file.

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

You can use the example by providing the paths to the build directory and output
CSV file:

```sh
node save.js dist sizes.csv
```

You could even add it as a `postpublish` script to keep track of your build
sizes for each release! As a matter of fact, scratch that I'm adding it to the
package 🚀

Use the `-o` or `--outfile` flag to specify the CSV file's location:

```diff
 "scripts": {
    "publish": "... && npm publish",
+   "postpublish": "build-sizes dist -o=sizes.csv",
    ...
```

The `saveBuildSizes` function is also exported, so you can use it in your
scripts!

> **Note:** The save script requires the current working directory to contain
> `package.json` so it can grab the project's version number. I recommend using
> an npm script like the snippet above, which allows you to run the script from
> any directory in the project.
