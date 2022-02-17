# Build sizes

A small script which provides sizes of a production build. 

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

Other common directory names frameworks use for production builds are `dist` and `public`.

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

### Using the function

The package also exports an asynchronous function:

```js
const { getBuildSizes } = require("build-sizes");

(async () => {
    try {
        const buildSizes = await getBuildSizes("your-app/build-path");
        console.log(buildSizes)
        ...
    } catch (err) {
        console.error(err);
        process.exitCode = 1;
    }
})();
```

#### Parameters

The function requires one parameter.

| Parameter | Description                                                                      | Type   |
| --------- | -------------------------------------------------------------------------------- | ------ |
| buildPath | path from the current working directory to the sample's build directory | string |

#### Return properties

The function returns an object with three properties.

| Property       | Description                                | Type   |
| -------------- | ------------------------------------------ | ------ |
| mainBundleSize | size of the largest JavaScript bundle file | number |
| buildSize      | size of all files in the build directory   | number |
| fileCount      | count of all files in the build directory  | number |
