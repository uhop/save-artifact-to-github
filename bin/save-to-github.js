#!/usr/bin/env node

'use strict';

const {promises: fsp} = require('fs');
const path = require('path');
const zlib = require('zlib');
const {promisify} = require('util');
const {spawnSync} = require('child_process');

const github = require('@actions/github');

const spawnOptions = {encoding: 'utf8', env: process.env};
const getPlatform = () => {
  const platform = process.platform;
  if (platform !== 'linux') return platform;
  // detecting musl using algorithm from https://github.com/lovell/detect-libc under Apache License 2.0
  let result = spawnSync('getconf', ['GNU_LIBC_VERSION'], spawnOptions);
  if (!result.status && !result.signal) return platform;
  result = spawnSync('ldd', ['--version'], spawnOptions);
  if (result.signal) return platform;
  if ((!result.status && result.stdout.toString().indexOf('musl') >= 0) || (result.status === 1 && result.stderr.toString().indexOf('musl') >= 0))
    return platform + '-musl';
  return platform;
};
const platform = getPlatform();

const getParam = (name, defaultValue = '') => {
  const index = process.argv.indexOf('--' + name);
  if (index > 0) return process.argv[index + 1] || '';
  return defaultValue;
};

const artifactPath = getParam('artifact'),
  prefix = getParam('prefix'),
  suffix = getParam('suffix');

const main = async () => {
  const [OWNER, REPO] = process.env.GITHUB_REPOSITORY.split('/'),
    TAG = /^refs\/tags\/(.*)$/.exec(process.env.GITHUB_REF)[1];

  const fileName = `${prefix}${platform}-${process.arch}-${process.versions.modules}${suffix}`;

  console.log('Preparing artifact', fileName, '...');

  const octokit = github.getOctokit(process.env.GITHUB_TOKEN);

  const [data, uploadUrl] = await Promise.all([
    fsp.readFile(path.normalize(artifactPath)),
    octokit.repos.getReleaseByTag({owner: OWNER, repo: REPO, tag: TAG}).then(response => response.data.upload_url)
  ]);

  console.log('Compressing and uploading ...');

  await Promise.all([
    (async () => {
      if (!zlib.brotliCompress) return null;
      const compressed = await promisify(zlib.brotliCompress)(data, {params: {[zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY}});
      return octokit.repos
        .uploadReleaseAsset({
          url: uploadUrl,
          data: compressed,
          name: fileName + '.br',
          label: `Binary artifact: ${artifactPath} (${platform}, ${process.arch}, ${process.versions.modules}, brotli).`,
          headers: {'content-type': 'application/brotli', 'content-length': compressed.length}
        })
        .then(() => console.log('Uploaded BR.'))
        .catch(() => console.log('BR has failed to upload.'));
    })(),
    (async () => {
      if (!zlib.gzip) return null;
      const compressed = await promisify(zlib.gzip)(data, {level: zlib.constants.Z_BEST_COMPRESSION});
      return octokit.repos
        .uploadReleaseAsset({
          url: uploadUrl,
          data: compressed,
          name: fileName + '.gz',
          label: `Binary artifact: ${artifactPath} (${platform}, ${process.arch}, ${process.versions.modules}, gzip).`,
          headers: {'content-type': 'application/gzip', 'content-length': compressed.length}
        })
        .then(() => console.log('Uploaded GZ.'))
        .catch(() => console.log('GZ has failed to upload.'));
    })()
  ]);
  console.log('Done.');
};

main().catch(e => {
  console.log('::error::' + ((e && e.message) || 'create-binary-asset has failed'));
  process.exit(1);
});
