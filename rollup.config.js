/*
 Copyright 2019 Google Inc. All Rights Reserved.
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
*/

const asyncToPromises = require('babel-plugin-transform-async-to-promises');
const fs = require('fs-extra');
const path = require('path');
const {rollup} = require('rollup');
const babel = require('rollup-plugin-babel');
const commonjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');
const pkg = require('./package.json');
const {terser} = require('rollup-plugin-terser');


const ASSET_MANIFEST_FILENAME = 'asset-manifest.json';
const BUILT_IN_MODULE_MAP = {
  'std:kv-storage': 'src/kv-storage/index.js',
};

const builtInModulePlugin = (moduleMap, {codeSplit = true} = {}) => {
  return {
    options(opts) {
      if (codeSplit) {
        Object.assign(opts.input, moduleMap);
      }
    },
    resolveId(importee) {
      if (importee.startsWith('std:')) {
        return path.resolve(moduleMap[importee]);
      }
    },
  };
};

const assetManifestPlugin = (manifestBasename) => {
  return {
    generateBundle(options, bundle) {
      const manifestFile = path.join(options.dir, manifestBasename);
      const assetManifest = fs.existsSync(manifestFile) ?
          fs.readJsonSync(manifestFile) : {};

      for (const [filename, assetInfo] of Object.entries(bundle)) {
        assetManifest[assetInfo.name] = `/${filename}`;
      }
      fs.outputJsonSync(manifestFile, assetManifest);
    },
  };
};

module.exports = [
  // Module config for <script type="module">
  {
    input: {
      'main': 'src/main.mjs',
    },
    output: {
      dir: pkg.config.publicDir,
      format: 'esm',
      entryFileNames: '[name]-[hash].mjs',
    },
    plugins: [
      builtInModulePlugin(BUILT_IN_MODULE_MAP),
      assetManifestPlugin(ASSET_MANIFEST_FILENAME),
      terser({module: true}),
    ],
  },
  // Legacy config for <script nomodule>
  {
    input: {
      'nomodule': 'src/main.mjs',
    },
    output: {
      dir: pkg.config.publicDir,
      format: 'iife',
      entryFileNames: '[name]-[hash].js',
    },
    plugins: [
      // Don't code split in the legacy build since it's not supported in
      // Rollup, and we're using the built-in module polyfills.
      builtInModulePlugin(BUILT_IN_MODULE_MAP, {codeSplit: false}),
      assetManifestPlugin(ASSET_MANIFEST_FILENAME),

      // Add babel, which also requires commonjs support to include polyfills.
      nodeResolve(),
      commonjs(),
      babel({
        exclude: [
          /core-js/,
          /regenerator-runtime/,
        ],
        presets: [['@babel/preset-env', {
          targets: {browsers: ['ie 11']},
          useBuiltIns: 'usage',
          debug: true,
          loose: true,
          // Exclude regenerator since we're using async-to-promises.
          exclude: ['@babel/plugin-transform-regenerator']
        }]],
        plugins: [asyncToPromises],
      }),
      // terser(),
    ],
    onwarn: (warning, warn) => {
      // Silence circular dependency warning for core-js.
      if (warning.code === 'CIRCULAR_DEPENDENCY' &&
          warning.importer.includes('node_modules/core-js')) {
        return;
      }
      warn(warning);
    }
  },
]
