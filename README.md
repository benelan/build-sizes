# Build sizes

A small script that provides build sizes to assist with optimization.

<br>
<div align="center">
    <b>🚀 Available as an
    <a href="https://www.npmjs.com/package/build-sizes" target="_blank" rel="noreferrer noopener">NPM package</a>!
    🚀</b>
</div>

## Installation

Install the package globally and use it anywhere:

```bash
npm i -g build-sizes
```

Or use it in a single application:

```bash
npm i -D build-sizes
```

## Usage

To run the script, you need to provide the path from the current working directory to the application's build directory. For example, `create-react-app` generates a directory named `build` for production. Once the application is built, you can get the sizes by running the following from the application's root directory:

```bash
build-sizes build
```

And the output to the console is:

```
-------------------------------
|-> Application Build Sizes <-|
-------------------------------
Main js bundle size: 268.61 KB
On-disk build size: 3.03 MB
On-disk build files: 4761
-------------------------------
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

The package also exports a few functions. Here is a usage example:

```js
const { getBuildSizes, formatBytes } = require("build-sizes");

(async () => {
  try {
    const { mainBundleSize, buildSize, buildFileCount } = await getBuildSizes(
      "your-app/build-path"
    );

    console.log(
      "Main bundle size:",
      formatBytes(mainBundleSize),
      "\nOn-disk build size:",
      formatBytes(buildSize),
      "\nOn-disk build files:",
      buildFileCount
    );
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  }
})();
```

## Reference

Descriptions, parameters, and return values for the exported functions.

---

### getBuildSizes

Gets sizes for an application's production build.

| Parameter              | Description                                                                  | Type     |
| ---------------------- | ---------------------------------------------------------------------------- | -------- |
| buildPath `(required)` | path from the current working directory to the application's build directory | `string` |
| bundleFileType         | type of the bundle files (default is `js`)                                   | `string` |

The function returns a `Promise` which resolves an object with three properties.

| Return Property | Description                                                    | Type     |
| --------------- | -------------------------------------------------------------- | -------- |
| mainBundleSize  | size in bytes of the largest bundle file of the specified type | `number` |
| buildSize       | size in bytes of all files in the build directory              | `number` |
| buildFileCount  | count of all files in the build directory                      | `number` |

---

### formatBytes

Formats bytes to a human readable size.

| Parameter          | Description                                      | Type      |
| ------------------ | ------------------------------------------------ | --------- |
| bytes `(required)` | bytes to format into human readable size         | `number`  |
| decimals           | decimal precision for rounding (default is `2`)  | `number`  |
| binary             | binary or decimal conversion (default is `true`) | `boolean` |

The function returns a human readable size with units (`string`).

---

### getFiles

Gets all files in a directory (recursively).

| Parameter                  | Description                                                                   | Type     |
| -------------------------- | ----------------------------------------------------------------------------- | -------- |
| directoryPath `(required)` | path from the current working directory to the directory containing the files | `string` |

The function returns a `Promise` which resolves an array of objects with two properties.

| Return Property | Description               | Type     |
| --------------- | ------------------------- | -------- |
| path            | absolute path of the file | `string` |
| name            | name of the file          | `string` |

---

### filterFilesByType

Filters files by filetype.

| Parameter          | Description                                     | Type                             |
| ------------------ | ----------------------------------------------- | -------------------------------- |
| files `(required)` | files from the [`getFiles`](#getfiles) function | `{path: string, name: string}[]` |
| type `(required)`  | file type, e.g. `"js"`, `"css"`, `"tsx"`, etc.  | `string`                         |

The function returns the `files` filtered by type.

---

### getFileSizes

Gets file sizes.

| Parameter          | Description                                     | Type                             |
| ------------------ | ----------------------------------------------- | -------------------------------- |
| files `(required)` | files from the [`getFiles`](#getfiles) function | `{path: string, name: string}[]` |

The function returns a `Promise` which resolves an array of file sizes (`number[]`).

---
