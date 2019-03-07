# Built-in Module Demo (with Rollup)

This demo shows how to use the [built-in KV Storage module](https://developers.google.com/web/updates/2019/03/kv-storage) in your application code, and bundle it with [Rollup](https://rollupjs.org) so it's served as a [progressive enhancement](https://en.wikipedia.org/wiki/Progressive_enhancement) and works in all browsers (including Internet Explorer). Browsers that don't support KV Storage natively will use the [KV Storage polyfill](https://github.com/GoogleChromeLabs/kv-storage-polyfill).

The demo itself is a very basic "User settings" page with a set of check boxes that can be saved and persisted across page loads.

🚀&nbsp;&nbsp;**[DEMO](https://rollup-built-in-modules.glitch.me/)**&nbsp;&nbsp;👉

## How it works

This demo works with the help of a small Rollup plugin, `builtInModules()`, which is included in the [`rollup.config.js`](https://glitch.com/edit/#!/rollup-built-in-modules?path=rollup.config.js:1:0) file.

This plugin does three things:

1. It maps import statements that reference built-in modules to their polyfill fallbacks.
2. It adds each polyfill as an intput/entry point (for [code splitting](https://rollupjs.org/guide/en#code-splitting)), which allows them to be conditionally loaded.
3. It creates an entry manifest from which you can create an [import map](https://github.com/WICG/import-maps) in your HTML page.

_(**Note:** the plugin source is well-commented, so looking at the code might give you the best sense of how it works.)_

### Using the plugin

To use the plugin, the first thing you need to do in your configuration is to define a mapping between the built-in modules you want to use (in this case `std:kv-storage`) and the location of each module's fallback polyfill (either a node module or a local file path):

```js
const BUILT_IN_MODULE_MAP = {
  // This list will grow as more built-in modules are introduced:
  'std:kv-storage': 'kv-storage-polyfill',
};
```

Next you call the plugin function and pass it the module mapping defined above. A sample Rollup configuration might look like this:

```js
// `rollup.config.js`
const BUILT_IN_MODULE_MAP = {
  // This list will grow as more built-in modules are introduced:
  'std:kv-storage': 'kv-storage-polyfill',
};

export default {
  input: {
    main: 'src/main.mjs',
  },
  output: {
    dir: 'public',
    format: 'esm',
    entryFileNames: '[name]-[hash].mjs',
  },
  plugins: [
    builtInModules(BUILT_IN_MODULE_MAP),
  ],
};
```

Given the above configuration and a `main` entry point that imports `std:kv-storage`, the plugin will replace all references to the built-in module with the polyfill:

```diff
-import {storage} from 'std:kv-storage';
+import {storage} from 'kv-storage-polyfill';
```

It also adds `kv-storage-polyfill` to the entry list, which forces it to be code split into a separate output file.

Lastly, it generates a manifest of entry paths to output paths (which is important when using hash versioning). The manifest that would be generated for the above configuration might look something like this:

```json
{
  "std:kv-storage": "/std-kv-storage-c8bdb793.mjs",
  "main": "/main-3e5caa7b.mjs"
}
```

### Creating the import map

From this manifest you can create an [import map](https://github.com/WICG/import-maps) that lets browsers who support import maps and built-in modules load them when available.

The following code is used in [`server.js`](https://glitch.com/edit/#!/rollup-built-in-modules?path=server.js:1:0) to generate the import map and use it when rendering the demo page:

```js
const generateImportMap = (manifest) => {
  const importmap = {imports: {}};
  for (const [name, filepath] of Object.entries(manifest)) {
    if (name.startsWith('std:')) {
      importmap.imports[filepath] = [name, filepath];
    }
  }
  return JSON.stringify(importmap, null, 2);
};
```

The generated import map looks like this, which you can also see when you view the source of the [demo HTML page](https://rollup-built-in-modules.glitch.me/):

```html
<script type="importmap">
{
  "imports": {
    "/std-kv-storage-c8bdb793.mjs": [
      "std:kv-storage",
      "/std-kv-storage-c8bdb793.mjs"
    ]
  }
}
</script>
```

This import maps tells browsers that whenever they see an import statement referencing the URL `/std-kv-storage-c8bdb793.mjs`, first try to load `std:kv-storage`, and if that does work, then try to load `/std-kv-storage-c8bdb793.mjs` (which is the same file as the import key).

This allows browsers that don't support import maps (or a given built-in module) to still work while allowing browsers that do support them to avoid loading a polyfill.

### Supporting browsers that don't support modules

The final thing we need to do is configure Rollup to generate an ES5 version of this code that includes the built-in module polyfill as well as any other polyfills needed for it to be able to run in old browsers like IE 11.

Since there's already plenty of good examples on the internet that [explain how to do this](https://calendar.perfplanet.com/2018/doing-differential-serving-in-2019/), I won't re-explain it here. But you can refer to my [demo's Rollup config](https://glitch.com/edit/#!/rollup-built-in-modules?path=rollup.config.js:113:15) if you want to see how I did it.

Here's a link to the [full working demo](https://rollup-built-in-modules.glitch.me/). Make sure to try it in Chrome 74+ (with the experimental web platofrm features flag on) to see it working without the polyfill!
