/// <reference types="vitest/config" />
import {defineConfig} from 'vite';
import {turboWarpExtension} from '@kubohiroya/vite-plugin-turbowarp-extension';
import definitions from './src/block-definitions.json' with { type: 'json' };
import {extensionConfig} from './src/config.js';
import {extensionManifestPlugin} from './src/extension-manifest.js';
import {threeVrmFactoryPlugin} from './scripts/three-vrm-factory-plugin.js';

export default defineConfig({
  plugins: [
    threeVrmFactoryPlugin(),
    turboWarpExtension({
      id: extensionConfig.id,
      name: extensionConfig.name,
      description: extensionConfig.description,
      author: extensionConfig.author,
      license: extensionConfig.license,
      fileName: `${extensionConfig.slug}.js`
    }),
    extensionManifestPlugin({
      id: extensionConfig.id,
      definitions
    })
  ],
  test: {
    // three-vrm tests run on the same super-three that A-Frame 1.8.0 ships. Its loaders
    // import "three", so they are inlined and pointed back at super-three.
    alias: [{find: /^three(\/.*)?$/u, replacement: 'super-three$1'}],
    server: {deps: {inline: [/super-three/u]}}
  }
});
