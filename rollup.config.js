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

import fs from 'fs-extra';
import path from 'path';
import babel from 'rollup-plugin-babel';
import commonjs from 'rollup-plugin-commonjs';
import nodeResolve from 'rollup-plugin-node-resolve';
import {terser} from 'rollup-plugin-terser';
import pkg from './package.json';


const BUILT_IN_MODULE_MAP = {
  // This list will grow as more built-in modules are introduced:
  'std:kv-storage': 'kv-storage-polyfill',
};

const builtInModules = (moduleMap, {
  manifestFile = 'entry-manifest.json',
  codeSplit = true,
} = {}) => {
  return {
    name: 'built-in-modules',
    // Uses the `options` hook to make sure each polyfill source file is added
    // as a distinct entry point. This is to ensure they'll be outputted as
    // separate files rather than included in the main bundle.
    // https://rollupjs.org/guide/en#code-splitting
    options(opts) {
      if (codeSplit === true) {
        for (const [id, entry] of Object.entries(moduleMap)) {
          // Replace the colon since many systems don't allow them.
          const safeId = id.replace(/^std:/g, 'std-');
          opts.input[safeId] = entry;
        }
      }
    },
    // Uses the `resolveId` hook to map import statements matching `std:*`
    // with to their polyfill source files.
    resolveId(importee, importer) {
      if (importee.startsWith('std:')) {
        return this.resolveId(moduleMap[importee]);
      }
    },
    // Uses the `generateBundle` hook to create a mapping of input names to
    // output URL file paths. This will be used to create our import map.
    generateBundle(options, bundle) {
      const manifestPath = path.join(options.dir, manifestFile);
      const entryManifest = fs.existsSync(manifestPath) ?
          fs.readJsonSync(manifestPath) : {};

      for (const [name, assetInfo] of Object.entries(bundle)) {
        // Restore the colon that was replaced above
        const originalName = assetInfo.name.replace(/^std-/, 'std:');
        entryManifest[originalName] = `/${name}`;
      }
      fs.outputJsonSync(manifestPath, entryManifest);
    },
  };
};

export default [
  // Module config for <script type="module">
  {
    input: {
      'main': 'src/main.js',
    },
    output: {
      dir: pkg.config.publicDir,
      format: 'esm',
      entryFileNames: '[name]-[hash].mjs',
    },
    plugins: [
      builtInModules(BUILT_IN_MODULE_MAP),
      nodeResolve(),
      // terser({module: true}),
    ],
  },
  // Legacy config for <script nomodule>
  {
    input: {
      'nomodule': 'src/main.js',
    },
    output: {
      dir: pkg.config.publicDir,
      format: 'iife',
      entryFileNames: '[name]-[hash].js',
    },
    plugins: [
      // Don't code split in the legacy build since it's not supported in
      // Rollup -- and we need to bundle the polyfills anyway.
      builtInModules(BUILT_IN_MODULE_MAP, {codeSplit: false}),
      nodeResolve(),

      // Add babel, which also requires commonjs support to include polyfills.
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
        }]],
      }),
      terser(),
    ],
  },
]
