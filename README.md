# Build sizes

A small script that provides sizes of production builds to assist with optimization.

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

### getBuildSizes

Provides sizes for an application's production build.

| Parameter | Description                                                                  | Type   |
| --------- | ---------------------------------------------------------------------------- | ------ |
| buildPath | path from the current working directory to the application's build directory | string |

The function returns a `Promise` which resolves an object with three properties.

| Return Property | Description                                         | Type   |
| --------------- | --------------------------------------------------- | ------ |
| mainBundleSize  | size in bytes of the largest JavaScript bundle file | number |
| buildSize       | size in bytes of all files in the build directory   | number |
| buildFileCount  | count of all files in the build directory           | number |

### formatBytes

Formats bytes to a human readable size.

| Parameter           | Description                                            | Type    |
| ------------------- | ------------------------------------------------------ | ------- |
| bytes               | bytes to format into human readable size               | number  |
| decimals (optional) | number of decimal points for rounding (default is `2`) | number  |
| binary (optional)   | binary or decimal conversion (default is `true`)       | boolean |

The function returns a `string` of a human readable size with units.

### getFiles

Returns all files in a directory (recursively).

| Parameter     | Description                                                                   | Type   |
| ------------- | ----------------------------------------------------------------------------- | ------ |
| directoryPath | path from the current working directory to the directory containing the files | string |

The function returns a `Promise` which resolves an array of objects with two properties.

| Return Property | Description               | Type   |
| --------------- | ------------------------- | ------ |
| path            | absolute path of the file | string |
| name            | name of the file          | string |
