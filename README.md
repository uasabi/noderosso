# Node-red

Smart automation.

## Running locally

You can run the project locally and automatically restart the server when there is a change with:

```bash
npm start
```

## Reading files from the `node_modules` folder.

You should use the Bazel's helper:

```ts
const runfiles = require(process.env['BAZEL_NODE_RUNFILES_HELPER']!)
if (runfiles) {
  const myNicePackageNameFolderInBazel = runfiles.resolve('npm//my-package-name')
}
```
