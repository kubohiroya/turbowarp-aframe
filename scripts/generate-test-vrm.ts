import {writeFile} from 'node:fs/promises';

/**
 * Writes a minimal VRM 1.0 humanoid for tests and the VRM demo: the required humanoid
 * bones, facing +Z in a T-pose, each drawn as a box. It is generated here so the
 * repository carries no third-party model or its licence.
 */

type Vec3 = [number, number, number];

interface Bone {
  name: string;
  parent: string | null;
  offset: Vec3;
  box: {center: Vec3; size: Vec3};
}

const bones: Bone[] = [
  bone('hips', null, [0, 0.95, 0], [0, 0.05, 0], [0.3, 0.14, 0.18]),
  bone('spine', 'hips', [0, 0.1, 0], [0, 0.16, 0], [0.32, 0.34, 0.18]),
  bone('neck', 'spine', [0, 0.33, 0], [0, 0.04, 0], [0.08, 0.08, 0.08]),
  bone('head', 'neck', [0, 0.08, 0], [0, 0.11, 0], [0.2, 0.22, 0.2]),
  bone('leftUpperArm', 'spine', [0.18, 0.3, 0], [0.13, 0, 0], [0.26, 0.08, 0.08]),
  bone('leftLowerArm', 'leftUpperArm', [0.26, 0, 0], [0.12, 0, 0], [0.24, 0.07, 0.07]),
  bone('leftHand', 'leftLowerArm', [0.24, 0, 0], [0.05, 0, 0], [0.1, 0.05, 0.08]),
  bone('rightUpperArm', 'spine', [-0.18, 0.3, 0], [-0.13, 0, 0], [0.26, 0.08, 0.08]),
  bone('rightLowerArm', 'rightUpperArm', [-0.26, 0, 0], [-0.12, 0, 0], [0.24, 0.07, 0.07]),
  bone('rightHand', 'rightLowerArm', [-0.24, 0, 0], [-0.05, 0, 0], [0.1, 0.05, 0.08]),
  bone('leftUpperLeg', 'hips', [0.09, -0.04, 0], [0, -0.21, 0], [0.11, 0.42, 0.11]),
  bone('leftLowerLeg', 'leftUpperLeg', [0, -0.42, 0], [0, -0.21, 0], [0.09, 0.42, 0.09]),
  bone('leftFoot', 'leftLowerLeg', [0, -0.42, 0], [0, -0.03, 0.05], [0.09, 0.06, 0.2]),
  bone('rightUpperLeg', 'hips', [-0.09, -0.04, 0], [0, -0.21, 0], [0.11, 0.42, 0.11]),
  bone('rightLowerLeg', 'rightUpperLeg', [0, -0.42, 0], [0, -0.21, 0], [0.09, 0.42, 0.09]),
  bone('rightFoot', 'rightLowerLeg', [0, -0.42, 0], [0, -0.03, 0.05], [0.09, 0.06, 0.2])
];

export function createTestVrm(): Uint8Array {
  const nodes: Record<string, unknown>[] = [];
  const boneIndex = new Map<string, number>();
  for (const {name, offset} of bones) {
    boneIndex.set(name, nodes.length);
    nodes.push({name, translation: offset, children: []});
  }
  for (const {name, parent, box} of bones) {
    const boneNode = nodes[boneIndex.get(name) as number] as {children: number[]};
    if (parent !== null) {
      (nodes[boneIndex.get(parent) as number] as {children: number[]}).children.push(
        boneIndex.get(name) as number
      );
    }
    boneNode.children.push(nodes.length);
    nodes.push({name: `${name}_box`, mesh: 0, translation: box.center, scale: box.size});
  }
  const rootNode = nodes.length;
  nodes.push({name: 'root', children: [boneIndex.get('hips')]});

  const {bin, accessors, bufferViews} = cubeBuffers();
  const humanBones = Object.fromEntries(bones.map(({name}) => [name, {node: boneIndex.get(name)}]));
  const json = {
    asset: {version: '2.0', generator: 'turbowarp-aframe generate-test-vrm'},
    extensionsUsed: ['VRMC_vrm'],
    scene: 0,
    scenes: [{nodes: [rootNode]}],
    nodes,
    meshes: [{primitives: [{attributes: {POSITION: 0, NORMAL: 1}, indices: 2, material: 0}]}],
    materials: [{pbrMetallicRoughness: {baseColorFactor: [0.35, 0.6, 0.95, 1], metallicFactor: 0}}],
    accessors,
    bufferViews,
    buffers: [{byteLength: bin.byteLength}],
    extensions: {
      VRMC_vrm: {
        specVersion: '1.0',
        meta: {
          name: 'turbowarp-aframe test humanoid',
          version: '1',
          authors: ['turbowarp-aframe'],
          licenseUrl: 'https://vrm.dev/licenses/1.0/',
          avatarPermission: 'everyone',
          commercialUsage: 'corporation',
          allowRedistribution: true,
          modification: 'allowModificationRedistribution'
        },
        humanoid: {humanBones}
      }
    }
  };
  return glb(json, bin);
}

function bone(name: string, parent: string | null, offset: Vec3, center: Vec3, size: Vec3): Bone {
  return {name, parent, offset, box: {center, size}};
}

function cubeBuffers() {
  const faces: Array<{normal: Vec3; corners: Vec3[]}> = [
    {normal: [1, 0, 0], corners: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]]},
    {normal: [-1, 0, 0], corners: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]]},
    {normal: [0, 1, 0], corners: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]]},
    {normal: [0, -1, 0], corners: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]]},
    {normal: [0, 0, 1], corners: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]]},
    {normal: [0, 0, -1], corners: [[1, -1, -1], [-1, -1, -1], [-1, 1, -1], [1, 1, -1]]}
  ];
  const positions = new Float32Array(faces.flatMap(({corners}) => corners.flat().map((v) => v / 2)));
  const normals = new Float32Array(faces.flatMap(({normal}) => [normal, normal, normal, normal].flat()));
  const indices = new Uint16Array(faces.flatMap((_, face) => [0, 1, 2, 0, 2, 3].map((i) => face * 4 + i)));
  const bin = new Uint8Array(positions.byteLength + normals.byteLength + indices.byteLength);
  bin.set(new Uint8Array(positions.buffer), 0);
  bin.set(new Uint8Array(normals.buffer), positions.byteLength);
  bin.set(new Uint8Array(indices.buffer), positions.byteLength * 2);
  return {
    bin,
    bufferViews: [
      {buffer: 0, byteOffset: 0, byteLength: positions.byteLength, target: 34962},
      {buffer: 0, byteOffset: positions.byteLength, byteLength: normals.byteLength, target: 34962},
      {buffer: 0, byteOffset: positions.byteLength * 2, byteLength: indices.byteLength, target: 34963}
    ],
    accessors: [
      {bufferView: 0, componentType: 5126, count: 24, type: 'VEC3', min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5]},
      {bufferView: 1, componentType: 5126, count: 24, type: 'VEC3'},
      {bufferView: 2, componentType: 5123, count: 36, type: 'SCALAR'}
    ]
  };
}

function glb(json: unknown, bin: Uint8Array): Uint8Array {
  const jsonBytes = pad(new TextEncoder().encode(JSON.stringify(json)), 0x20);
  const binBytes = pad(bin, 0);
  const out = new Uint8Array(12 + 8 + jsonBytes.byteLength + 8 + binBytes.byteLength);
  const view = new DataView(out.buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, out.byteLength, true);
  view.setUint32(12, jsonBytes.byteLength, true);
  view.setUint32(16, 0x4e4f534a, true);
  out.set(jsonBytes, 20);
  const binStart = 20 + jsonBytes.byteLength;
  view.setUint32(binStart, binBytes.byteLength, true);
  view.setUint32(binStart + 4, 0x004e4942, true);
  out.set(binBytes, binStart + 8);
  return out;
}

function pad(bytes: Uint8Array, fill: number): Uint8Array {
  const length = Math.ceil(bytes.byteLength / 4) * 4;
  const padded = new Uint8Array(length).fill(fill);
  padded.set(bytes);
  return padded;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = process.argv[2];
  if (out === undefined) throw new Error('Usage: node scripts/generate-test-vrm.ts <out.vrm>');
  await writeFile(out, createTestVrm());
  process.stdout.write(`Wrote ${out}\n`);
}
