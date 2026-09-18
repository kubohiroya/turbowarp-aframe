import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import type {Plugin} from 'vite';

export const threeVrmFactoryId = 'virtual:three-vrm-factory';
const resolvedId = `\0${threeVrmFactoryId}`;
const threeImport = /^import \* as (THREE\d*) from "three";$/gmu;
const namedThreeImport = /^import \{([^}]*)\} from "three";$/gmu;
const exportBlock = /^export \{([^}]*)\};$/mu;

/**
 * Serves three-vrm as `createThreeVrm(THREE)` so it runs on the Three.js that A-Frame
 * already loaded. three-vrm defines classes such as `class extends THREE.Object3D` while
 * its module evaluates, so it cannot run before A-Frame, and bundling a second Three.js
 * would break the `instanceof` checks inside GLTFLoader and its plugins.
 */
export function threeVrmFactoryPlugin(): Plugin {
  return {
    name: 'three-vrm-factory',
    resolveId(id) {
      return id === threeVrmFactoryId ? resolvedId : null;
    },
    load(id) {
      if (id !== resolvedId) return null;
      const require = createRequire(import.meta.url);
      const path = require.resolve('@pixiv/three-vrm').replace(/three-vrm\.cjs$/u, 'three-vrm.module.js');
      return toFactory(readFileSync(path, 'utf8'));
    }
  };
}

export function toFactory(source: string): string {
  const aliases = [...source.matchAll(threeImport)].map((match) => match[1] as string);
  if (aliases.length === 0) throw new Error('three-vrm no longer imports "three" as a namespace.');
  const exported = exportBlock.exec(source);
  if (exported === null) throw new Error('three-vrm no longer ends with a single export block.');
  const named = [...source.matchAll(namedThreeImport)].map(
    (match) => `const {${(match[1] as string).replace(/ as /gu, ': ')}} = __THREE__;`
  );
  const body = source.replace(threeImport, '').replace(namedThreeImport, '').replace(exportBlock, '');
  if (/^\s*(import|export)\s/mu.test(body)) {
    throw new Error('three-vrm has imports or exports the factory does not rewrite.');
  }
  const names = (exported[1] as string)
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return [
    'export function createThreeVrm(__THREE__) {',
    `const ${aliases.map((alias) => `${alias} = __THREE__`).join(', ')};`,
    ...named,
    body,
    `return {${names.join(', ')}};`,
    '}'
  ].join('\n');
}
