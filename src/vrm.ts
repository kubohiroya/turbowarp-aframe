import {createThreeVrm} from 'virtual:three-vrm-factory';

/** The subset of Three.js, as exposed by `AFRAME.THREE`, that VRM avatars use. */
export interface VrmThreeApi {
  GLTFLoader: new () => GltfLoaderLike;
  MathUtils: {degToRad(degrees: number): number};
}

interface GltfLoaderLike {
  register(callback: (parser: unknown) => unknown): unknown;
  loadAsync(url: string): Promise<{userData: {vrm?: VrmLike}}>;
}

interface BoneLike {
  rotation: {set(x: number, y: number, z: number): unknown};
}

export interface VrmLike {
  scene: object;
  meta?: {metaVersion?: string};
  humanoid: {
    humanBones: Record<string, unknown>;
    getNormalizedBoneNode(name: string): BoneLike | null;
  };
  expressionManager?: {
    expressions: ReadonlyArray<{expressionName: string}>;
    getExpression(name: string): unknown;
    setValue(name: string, weight: number): void;
  };
  update(deltaSeconds: number): void;
}

export type VrmState = 'none' | 'loading' | 'ready' | 'error';

interface VrmEntry {
  state: VrmState;
  error: string;
  vrm: VrmLike | null;
  generation: number;
}

/**
 * Loads VRM avatars onto A-Frame nodes and turns their humanoid bones.
 *
 * Rotations are written to the normalized humanoid bones, whose rest pose is the same
 * T-pose for every model, and `update` copies them to the model's own bones. That is
 * what makes one rotation mean the same thing on any VRM.
 */
export class VrmAvatars {
  private readonly entries = new Map<string, VrmEntry>();
  private vrmApi: ReturnType<typeof createThreeVrm> | null = null;
  private vrmApiThree: VrmThreeApi | null = null;
  private generation = 0;

  public constructor(private readonly getThree: () => VrmThreeApi | null) {}

  public async load(nodeId: string, url: string, attach: (scene: object) => void): Promise<void> {
    const generation = ++this.generation;
    this.remove(nodeId);
    const entry: VrmEntry = {state: 'loading', error: '', vrm: null, generation};
    this.entries.set(nodeId, entry);
    try {
      const THREE = this.requireThree();
      const {VRMLoaderPlugin, VRMUtils} = this.api(THREE);
      const loader = new THREE.GLTFLoader();
      loader.register((parser) => new VRMLoaderPlugin(parser as never));
      const gltf = await loader.loadAsync(url);
      const vrm = gltf.userData.vrm;
      if (vrm === undefined) throw new Error(`Not a VRM file: ${url}`);
      if (this.entries.get(nodeId)?.generation !== generation) {
        VRMUtils.deepDispose(vrm.scene as never);
        return;
      }
      VRMUtils.rotateVRM0(vrm as never);
      attach(vrm.scene);
      entry.vrm = vrm;
      entry.state = 'ready';
    } catch (error) {
      if (this.entries.get(nodeId)?.generation !== generation) return;
      entry.state = 'error';
      entry.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  public setBoneRotation(nodeId: string, bone: string, degrees: {x: number; y: number; z: number}): void {
    const vrm = this.requireVrm(nodeId);
    const node = vrm.humanoid.getNormalizedBoneNode(bone);
    if (node === null) throw new Error(`VRM ${nodeId} has no humanoid bone: ${bone}`);
    const {degToRad} = this.requireThree().MathUtils;
    node.rotation.set(degToRad(degrees.x), degToRad(degrees.y), degToRad(degrees.z));
  }

  /**
   * Sets an expression's weight. The weight is clamped to 0 through 1, as three-vrm does, and
   * the scene tick applies it with the other expressions.
   */
  public setExpression(nodeId: string, name: string, weight: number): void {
    if (!Number.isFinite(weight)) throw new Error(`VRM expression weight must be a number: ${weight}`);
    const vrm = this.requireVrm(nodeId);
    const expressions = vrm.expressionManager;
    if (expressions === undefined) throw new Error(`VRM ${nodeId} has no expressions.`);
    if (expressions.getExpression(name) == null) {
      throw new Error(`VRM ${nodeId} has no expression: ${name}`);
    }
    expressions.setValue(name, Math.min(Math.max(weight, 0), 1));
  }

  public expressionNames(nodeId: string): string[] {
    const expressions = this.entries.get(nodeId)?.vrm?.expressionManager?.expressions ?? [];
    return expressions.map((expression) => expression.expressionName);
  }

  public boneNames(nodeId: string): string[] {
    const vrm = this.entries.get(nodeId)?.vrm;
    if (vrm === null || vrm === undefined) return [];
    return Object.keys(vrm.humanoid.humanBones).filter(
      (name) => vrm.humanoid.getNormalizedBoneNode(name) !== null
    );
  }

  public state(nodeId: string): VrmState {
    return this.entries.get(nodeId)?.state ?? 'none';
  }

  public error(nodeId: string): string {
    return this.entries.get(nodeId)?.error ?? '';
  }

  public update(deltaSeconds: number): void {
    for (const entry of this.entries.values()) entry.vrm?.update(deltaSeconds);
  }

  public remove(nodeId: string): void {
    const entry = this.entries.get(nodeId);
    if (entry === undefined) return;
    this.entries.delete(nodeId);
    if (entry.vrm !== null && this.vrmApi !== null) {
      this.vrmApi.VRMUtils.deepDispose(entry.vrm.scene as never);
    }
  }

  public clear(): void {
    for (const nodeId of [...this.entries.keys()]) this.remove(nodeId);
  }

  private requireVrm(nodeId: string): VrmLike {
    const entry = this.entries.get(nodeId);
    if (entry?.vrm === null || entry?.vrm === undefined) {
      throw new Error(`VRM ${nodeId} is ${entry?.state ?? 'not loaded'}.`);
    }
    return entry.vrm;
  }

  private requireThree(): VrmThreeApi {
    const THREE = this.getThree();
    if (THREE === null) throw new Error('VRM avatars need A-Frame to be loaded first.');
    return THREE;
  }

  private api(THREE: VrmThreeApi): ReturnType<typeof createThreeVrm> {
    if (this.vrmApi === null || this.vrmApiThree !== THREE) {
      this.vrmApi = createThreeVrm(THREE);
      this.vrmApiThree = THREE;
    }
    return this.vrmApi;
  }
}
