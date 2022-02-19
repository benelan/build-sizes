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

Check out the documentation for more info about the functions.