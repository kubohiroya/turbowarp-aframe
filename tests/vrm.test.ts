import * as THREE from 'super-three';
import {GLTFLoader} from 'super-three/addons/loaders/GLTFLoader.js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createThreeVrm} from 'virtual:three-vrm-factory';
import {createTestVrm} from '../scripts/generate-test-vrm.js';
import {TurboWarpAFrameExtension} from '../src/extension.js';
import {runtimeCapabilityKey, type AFrameRuntimeCapabilityV2} from '../src/runtime-capability.js';
import {VrmAvatars, type VrmThreeApi} from '../src/vrm.js';

// Three.js reports download progress with ProgressEvent, which Node does not have.
globalThis.ProgressEvent ??= class extends Event {} as unknown as typeof ProgressEvent;

// The same shape as AFRAME.THREE in A-Frame 1.8.0: super-three plus its GLTFLoader.
const aframeThree = {...THREE, GLTFLoader} as unknown as VrmThreeApi;
const vrmUrl = `data:model/gltf-binary;base64,${Buffer.from(createTestVrm()).toString('base64')}`;
const requiredBones = [
  'hips',
  'spine',
  'head',
  'leftUpperArm',
  'leftLowerArm',
  'leftHand',
  'rightUpperArm',
  'rightLowerArm',
  'rightHand',
  'leftUpperLeg',
  'leftLowerLeg',
  'leftFoot',
  'rightUpperLeg',
  'rightLowerLeg',
  'rightFoot'
];

async function loaded() {
  const avatars = new VrmAvatars(() => aframeThree);
  const root = new THREE.Group();
  await avatars.load('avatar', vrmUrl, (scene) => root.add(scene as THREE.Object3D));
  return {avatars, root};
}

function worldPosition(root: THREE.Object3D, name: string): THREE.Vector3 {
  root.updateMatrixWorld(true);
  const node = root.getObjectByName(name);
  if (node === undefined) throw new Error(`missing ${name}`);
  return node.getWorldPosition(new THREE.Vector3());
}

describe('three-vrm on the A-Frame Three.js', () => {
  it('builds three-vrm from the Three.js it is given', () => {
    const api = createThreeVrm(THREE);
    expect(typeof api.VRMLoaderPlugin).toBe('function');
    expect(typeof api.VRMUtils.deepDispose).toBe('function');
  });

  it('loads a VRM 1.0 humanoid and lists its bones', async () => {
    const {avatars, root} = await loaded();
    expect(avatars.state('avatar')).toBe('ready');
    expect(avatars.boneNames('avatar')).toEqual(expect.arrayContaining(requiredBones));
    expect(root.children).toHaveLength(1);
  });

  it('turns the model bone through the normalized bone on update', async () => {
    const {avatars, root} = await loaded();
    const before = worldPosition(root, 'leftHand');
    expect(before.y).toBeCloseTo(1.35, 5);

    avatars.setBoneRotation('avatar', 'leftUpperArm', {x: 0, y: 0, z: -90});
    expect(worldPosition(root, 'leftHand').y).toBeCloseTo(before.y, 5);

    avatars.update(0);
    const after = worldPosition(root, 'leftHand');
    const shoulder = worldPosition(root, 'leftUpperArm');
    expect(after.x).toBeCloseTo(shoulder.x, 5);
    expect(after.y).toBeCloseTo(shoulder.y - 0.5, 5);
  });

  it('rejects a bone the model does not have', async () => {
    const {avatars} = await loaded();
    expect(() => avatars.setBoneRotation('avatar', 'leftThumbProximal', {x: 0, y: 0, z: 0})).toThrow(
      /no humanoid bone: leftThumbProximal/u
    );
    expect(() => avatars.setBoneRotation('other', 'hips', {x: 0, y: 0, z: 0})).toThrow(
      /other is not loaded/u
    );
  });

  it('drops a model whose node was removed while it loaded', async () => {
    const avatars = new VrmAvatars(() => aframeThree);
    const root = new THREE.Group();
    const loading = avatars.load('avatar', vrmUrl, (scene) => root.add(scene as THREE.Object3D));
    expect(avatars.state('avatar')).toBe('loading');
    avatars.remove('avatar');
    await loading;
    expect(avatars.state('avatar')).toBe('none');
    expect(root.children).toHaveLength(0);
  });

  it('reports a file that is not a VRM', async () => {
    const avatars = new VrmAvatars(() => aframeThree);
    await expect(avatars.load('avatar', 'data:model/gltf-binary;base64,AAAA', () => {})).rejects.toThrow();
    expect(avatars.state('avatar')).toBe('error');
  });

  it('asks for A-Frame when there is no Three.js', async () => {
    const avatars = new VrmAvatars(() => null);
    await expect(avatars.load('avatar', vrmUrl, () => {})).rejects.toThrow(/A-Frame to be loaded first/u);
  });
});

// Just enough of the browser for the extension to build its scene: each element carries a
// real Object3D, as A-Frame entities do.
class SceneElement extends EventTarget {
  public readonly children: SceneElement[] = [];
  public readonly dataset: Record<string, string> = {};
  public readonly style: Record<string, string> = {};
  public readonly object3D = new THREE.Group();
  public parentElement: SceneElement | null = null;
  public id = '';

  public append(child: SceneElement): void {
    child.parentElement = this;
    this.children.push(child);
    this.object3D.add(child.object3D);
  }

  public remove(): void {
    if (this.parentElement === null) return;
    this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
    this.parentElement.object3D.remove(this.object3D);
    this.parentElement = null;
  }

  public setAttribute(): void {}
}

function stubBrowser() {
  const stage = new SceneElement();
  const tick: Array<(time: number, delta: number) => void> = [];
  vi.stubGlobal('document', {
    createElement: () => new SceneElement(),
    getElementById: () => null,
    querySelector: (selector: string) => (selector === '[class*="stage_stage-wrapper"]' ? stage : null)
  });
  vi.stubGlobal('getComputedStyle', () => ({position: 'relative'}));
  vi.stubGlobal('HTMLCanvasElement', class {});
  vi.stubGlobal('HTMLElement', SceneElement);
  vi.stubGlobal('AFRAME', {
    THREE: aframeThree,
    components: {},
    registerComponent(_name: string, definition: {tick: (time: number, delta: number) => void}) {
      tick.push((time, delta) => definition.tick.call({data: {id: runtimeId()}}, time, delta));
    }
  });
  vi.stubGlobal('Scratch', {
    vm: {runtime: {}},
    Cast: {toString: String, toNumber: Number, toBoolean: Boolean}
  });
  return {tick};
}

function runtimeId(): string {
  const runtimes = (globalThis as {__twAframeAnimationRuntimes?: Map<string, unknown>})
    .__twAframeAnimationRuntimes;
  return [...(runtimes?.keys() ?? [])].at(-1) ?? '';
}

describe('the capability on the A-Frame Three.js', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads a VRM through requireVersion(2) and turns it on the scene tick', async () => {
    const {tick} = stubBrowser();
    const extension = new TurboWarpAFrameExtension();
    extension.createScene({LAYER: 'above-stage', MODE: '3d'});
    extension.createNode({TYPE: 'empty', ID: 'avatar', PARENT: '#scene'});
    const capability = (Scratch.vm?.runtime ?? {})[runtimeCapabilityKey] as AFrameRuntimeCapabilityV2;
    const v2 = capability.requireVersion(2);

    const loading = v2.loadVrm(vrmUrl, '#avatar');
    expect(v2.vrmStatus('#avatar')).toEqual({state: 'loading', error: ''});
    await loading;
    expect(v2.vrmStatus('#avatar')).toEqual({state: 'ready', error: ''});
    expect(v2.vrmBoneNames('#avatar')).toEqual(expect.arrayContaining(requiredBones));

    const scene = (document.querySelector('[class*="stage_stage-wrapper"]') as unknown as SceneElement)
      .object3D;
    v2.setVrmBoneRotation('#avatar', 'leftUpperArm', 0, 0, -90);
    expect(worldPosition(scene, 'leftHand').y).toBeCloseTo(1.35, 5);
    expect(tick).toHaveLength(1);
    tick[0]?.(0, 16);
    expect(worldPosition(scene, 'leftHand').y).toBeCloseTo(0.85, 5);

    expect(() => v2.setVrmBoneRotation('#avatar', 'tail', 0, 0, 0)).toThrow(/no humanoid bone: tail/u);
    v2.deleteSelector('#avatar');
    expect(v2.vrmStatus('#avatar')).toEqual({state: 'none', error: ''});
    expect(scene.getObjectByName('leftHand')).toBeUndefined();
    extension.dispose();
  });
});
