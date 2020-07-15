# save-artifact-to-github [![NPM version][npm-img]][npm-url]

[npm-img]: https://img.shields.io/npm/v/save-artifact-to-github.svg
[npm-url]: https://npmjs.org/package/save-artifact-to-github

This is a minimal-dependency micro helper for developers of binary addons for Node.
It is companion project is `install-artifact-from-github`.
These two projects are integrated with [GitHub](https://github.com/) facilities and solve two problems:

* `save-artifact-to-github` saves a binary artifact according to platform, architecture, and Node ABI.
* `install-artifact-from-github` retrieves such artifact, tests if it works properly, and rebuilds a project from sources in the case of failure.

In general it can save your users from a long recompilation and, in some cases, even save them from installing build tools.
By using GitHub facilities ([Releases](https://docs.github.com/en/github/administering-a-repository/about-releases)
and [Actions](https://github.com/features/actions)) the whole process of publishing and subsequent installations is secure,
transparent, inexpensive or even free for public repositories.

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
    "save-to-github": "save-to-github --artifact build/Release/ABC.node",
  }
}
```

Let's assume that our workflow is like that:

* Development with multiple commits, tests, rinse, repeat.
* When we are ready to release we tag using a [semantic versioning](https://semver.org/), e.g., `2.0.1`.
* Now is the good time to build and save artifacts.
* Then we publish our package on [npm](https://www.npmjs.com/), [GitHub Packages](https://github.com/features/packages),
  or any other repository of your choice.

Let's enable GitHub actions on the project to automate our builds on tagging.
Create a file (e.g., `build.yml`) in `.github/workflows` folder with the following content:

```yml
name: Node.js builds

on:
  push:
    tags:
      - v?[0-9]+.[0-9]+.[0-9]+.[0-9]+
      - v?[0-9]+.[0-9]+.[0-9]+
      - v?[0-9]+.[0-9]+

jobs:
  create-release:
    name: Create release
    runs-on: ubuntu-latest

    steps:
    - name: Create release
      uses: actions/create-release@v1
      env:
        GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
      with:
        tag_name: ${{github.ref}}
        release_name: Release ${{github.ref}}
        draft: false
        prerelease: false

  build:
    name: Node.js ${{matrix.node-version}} on ${{matrix.os}}
    needs: create-release
    runs-on: ${{matrix.os}}

    strategy:
      matrix:
        os: [windows-latest, macOS-latest, ubuntu-latest]
        node-version: [10, 12, 14]

    steps:
    - uses: actions/checkout@v2
      with:
        submodules: true
    - name: Setup Node.js ${{matrix.node-version}}
      uses: actions/setup-node@v1
      with:
        node-version: ${{matrix.node-version}}
    - name: Get NPM cache directory
      id: npm-cache
      run: |
        echo "::set-output name=dir::$(npm config get cache)"
    - name: Cache node modules
      uses: actions/cache@v2
      with:
        path: ${{steps.npm-cache.outputs.dir}}
        key: ${{runner.os}}-node-${{hashFiles('**/package-lock.json')}}
        restore-keys: |
          ${{runner.os}}-node-
          ${{runner.os}}-
    - name: Install the package and run tests
      env:
        DEVELOPMENT_SKIP_GETTING_ASSET: true
      run: |
        npm ci
        npm run build --if-present
        npm test
    - name: Save to GitHub release
      env:
        GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
      run: npm run save-to-github
```

It will build and save 9 artifacts on all permutations of Windows/MacOS/Ubuntu for Node 10/12/14.

### Environment variables

The project doesn't use any user-settable environment variables, but
it is meant to be run using a GitHub action. It relies on
[GitHub action's environment variables](https://docs.github.com/en/actions/configuring-and-managing-workflows/using-environment-variables)
for security and information on a repository and a tag.

### Command-line parameters

* `--artifact path` &mdash; points where to take the artifact from. It is a required parameter.
* `--prefix prefix` &mdash; provides a prefix for the generated artifact name. Default: `''`.
* `--suffix suffix` &mdash; provides a suffix for the generated artifact name. Default: `''`.

Ultimately, the file name has the following format:

```js
`${prefix}${platform}-${arch}-${abi}${suffix}.${compression}`
```

Where:

* `platform` is [process.platform](https://nodejs.org/api/process.html#process_process_platform).
  * Because Linux has different implementations of the C standard library, a special case is made for
    [musl](https://musl.libc.org/) used by such popular distributions like [Alpine](https://alpinelinux.org/).
    Such platforms has a code `linux-musl`.
* `arch` is [process.arch](https://nodejs.org/api/process.html#process_process_arch).
* `abi` is [process.versions.modules](https://nodejs.org/api/process.html#process_process_versions).
* `compression` can be `br` (if available on the platform) or `gz`.

Example with default values: `linux-x64-83.br`.

## Documentation

The additional documentation is available in the [wiki](https://github.com/uhop/save-artifact-to-github/wiki).

### Example

The realistic complex example can be found in [uhop/node-re2](https://github.com/uhop/node-re2):

* [package.json](https://github.com/uhop/node-re2/blob/master/package.json) sets it up.
* [builds.yaml](https://github.com/uhop/node-re2/blob/master/.github/workflows/build.yml) implements a complex workflow.

## Release history

- 1.0.0 *initial release (extracted from [node-re2](https://github.com/uhop/node-re2)).*
