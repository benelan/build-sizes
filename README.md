# Build sizes
 A small script that provides production build sizes to assist with optimization.

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
Main bundle size: 1.62 MB
On-disk size: 26.45 MB
On-disk files: 419
-------------------------------
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
      "Main bundle size: ",
      formatBytes(mainBundleSize),
      "\nOn-disk size: ",
      formatBytes(buildSize),
      "\nOn-disk files: ",
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

| Parameter | Description                                                                  | Type   |
| --------- | ---------------------------------------------------------------------------- | ------ |
| buildPath | path from the current working directory to the application's build directory | string |

The function returns a `Promise` which resolves an object with three properties.
- return type: `Promise<{ mainBundleSize: number, buildSize: number, buildFileCount: number}>`

| Return Property | Description                                         | Type   |
| --------------- | --------------------------------------------------- | ------ |
| mainBundleSize  | size in bytes of the largest JavaScript bundle file | number |
| buildSize       | size in bytes of all files in the build directory   | number |
| buildFileCount  | count of all files in the build directory           | number |

---

### formatBytes

Formats bytes to a human readable size.

| Parameter           | Description                                      | Type    |
| ------------------- | ------------------------------------------------ | ------- |
| bytes               | bytes to format into human readable size         | number  |
| decimals (optional) | decimal precision for rounding(default is `2`)   | number  |
| binary (optional)   | binary or decimal conversion (default is `true`) | boolean |

The function returns a human readable size with units.
- return type: `string`

---

### getFiles

Gets all files in a directory (recursively).

| Parameter     | Description                                                                   | Type   |
| ------------- | ----------------------------------------------------------------------------- | ------ |
| directoryPath | path from the current working directory to the directory containing the files | string |

The function returns a `Promise` which resolves an array of objects with two properties.
- return type: `Promise<{path: string, name: string}[]>`

| Return Property | Description               | Type   |
| --------------- | ------------------------- | ------ |
| path            | absolute path of the file | string |
| name            | name of the file          | string |

---

### filterFilesByType

Filters files by filetype.

| Parameter | Description                                     | Type                           |
| --------- | ----------------------------------------------- | ------------------------------ |
| files     | files from the [`getFiles`](#getfiles) function | {path: string, name: string}[] |
| type      | file type, e.g. "js", "css", "tsx", etc.        | string                         |

The function returns the files filtered by type.
- return type: `{path: string, name: string}[]`

---

### getFileSizes

Gets file sizes.

| Parameter | Description                                     | Type                           |
| --------- | ----------------------------------------------- | ------------------------------ |
| files     | files from the [`getFiles`](#getfiles) function | {path: string, name: string}[] |


The function returns a `Promise` which resolves an array of file sizes.
- return type: `Promise<numbers[]>`

---