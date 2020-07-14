# save-artifact-to-github [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/save-artifact-to-github.svg
[npm-url]: https://npmjs.org/package/save-artifact-to-github

This is a no-dependency micro helper for developers of binary addons for Node.
It is integrated with [GitHub](https://github.com/) facilities and solves two problems:

* It can save a binary artifact according to platform, architecture, and Node ABI.
* It can retrieve such artifact, test if it works properly, and rebuild a project from sources in the case of failure.

In general it can save your users from a long recompilation and, in some cases, even save them from installing build tools.
By using GitHub facilities (Releases and Actions) the whole process of publishing and subsequent installations is secure and transparent.

## How to install

Installation:

```
npm install --save save-artifact-to-github
```

## How to use

In your `package.json` (pseudo-code with comments):

```js
{
  // your custom package.json stuff
  // ...
  "scripts": {
    // your scripts go here
    // ...

    // creates an artifact
    "create-binary-asset": "create-binary-asset.js --artifact build/Release/ABC.node",

    // installs using pre-created artifacts
    "install": "install-from-cache.js --artifact build/Release/ABC.node",

    // used by "install" to test the artifact
    "verify-build": "node scripts/verify-build.js"

    // used by "install" to rebuild from sources
    "rebuild": "node-gyp rebuild"
  }
}
```

Now we have to enable GitHub actions on the project.

## Release history

- 1.0.0 *initial release (extracted from [node-re2](https://github.com/uhop/node-re2)).*
