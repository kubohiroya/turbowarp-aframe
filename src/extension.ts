import {extensionConfig} from './config';
import definitions from './block-definitions.json';
import {
  createRuntimeCapability,
  runtimeCapabilityKey,
  type AFrameRuntimeCapabilityV2,
  type AFrameVrmStatus
} from './runtime-capability.js';
import {ensureAFrame} from './aframe-loader.js';
import {VrmAvatars, type VrmThreeApi} from './vrm.js';

type BlockTypeName = 'COMMAND' | 'REPORTER' | 'HAT' | 'BOOLEAN';
type ArgumentTypeName = 'STRING' | 'NUMBER' | 'BOOLEAN';
type Vec3 = {x: number; y: number; z: number};

interface DefinitionArgument {
  type: ArgumentTypeName;
  defaultValue?: string | number | boolean;
}

interface BlockDefinition {
  opcode: string;
  blockType: BlockTypeName;
  text: string;
  description: string;
  arguments: Record<string, DefinitionArgument>;
}

interface TemplateNode {
  type?: string;
  id?: string;
  class?: string | string[];
  classes?: string[];
  data?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  children?: TemplateNode[];
}

interface SceneNode {
  id: string;
  type: string;
  parentId: string | null;
  children: string[];
  classes: Set<string>;
  data: Map<string, string>;
  attributes: Map<string, string>;
  element: Element | null;
}

interface SceneEvent {
  type: string;
  targetId: string;
  data: string;
}

/**
 * Where the scene host sits relative to the TurboWarp stage.
 *
 * This is the whole vocabulary, and `turbowarp-ar` uses the same two values for its camera
 * background. `mode` stays an open string because it only describes intent; `layer` decides where
 * the host is drawn, so a value the host cannot honor does not belong in it.
 */
type SceneLayer = 'above-stage' | 'below-stage';

const SCENE_LAYERS: readonly SceneLayer[] = Object.freeze(['above-stage', 'below-stage']);
const DEFAULT_SCENE_LAYER: SceneLayer = 'above-stage';

/**
 * Stacking positions for the two hosts that can share the stage.
 *
 * `turbowarp-ar` puts its camera background one step below the `above-stage` value here, so a 3D
 * scene renders over the camera image. Keep the two in step when either extension changes.
 */
const SCENE_HOST_Z_INDEX: Record<SceneLayer, string> = {'above-stage': '10', 'below-stage': '0'};

interface SceneOptions {
  layer: SceneLayer;
  mode: string;
}

type KeyframeTrackType = 'vector' | 'quaternion';

interface KeyframeTrackDefinition {
  type: KeyframeTrackType;
  path: string;
  times: number[];
  values: number[];
}

interface AnimationClipDefinition {
  name: string;
  duration: number;
  tracks: KeyframeTrackDefinition[];
}

interface AnimationPlayback {
  nodeId: string;
  clipName: string;
  loop: boolean;
  active: boolean;
  paused: boolean;
  timeScale: number;
  mixer: AnimationMixerLike | null;
  action: AnimationActionLike | null;
}

interface AnimationActionLike {
  paused?: boolean;
  timeScale?: number;
  setLoop?(mode: unknown, repetitions: number): AnimationActionLike;
  play?(): AnimationActionLike;
  stop?(): AnimationActionLike;
}

interface AnimationMixerLike {
  clipAction(clip: unknown): AnimationActionLike;
  update(deltaTime: number): void;
  stopAllAction?(): void;
}

interface ThreeAnimationApi {
  AnimationClip: new (name: string, duration: number, tracks: unknown[]) => unknown;
  AnimationMixer: new (root: unknown) => AnimationMixerLike;
  LoopOnce?: unknown;
  LoopRepeat?: unknown;
  QuaternionKeyframeTrack: new (name: string, times: number[], values: number[]) => unknown;
  VectorKeyframeTrack: new (name: string, times: number[], values: number[]) => unknown;
}

type AFrameApi = {
  THREE?: ThreeAnimationApi;
  components?: Record<string, unknown>;
  registerComponent(name: string, definition: unknown): void;
};

interface VrmHostElement {
  object3D?: {add(object: object): void};
  setObject3D?(name: string, object: object): void;
}

const blockDefinitions = definitions.blocks as readonly BlockDefinition[];
const ROOT_ID = 'scene';
const DOM_EVENT_TYPES = ['click', 'tap', 'pointerenter', 'pointerleave'] as const;
const TEMPLATE_NODE_KEYS = new Set([
  'attributes',
  'children',
  'class',
  'classes',
  'data',
  'id',
  'type'
]);

export class TurboWarpAFrameExtension implements TurboWarpExtension {
  private readonly nodes = new Map<string, SceneNode>();
  private readonly templates = new Map<string, TemplateNode>();
  private readonly animationClips = new Map<string, AnimationClipDefinition>();
  private readonly animationPlaybacks = new Map<string, AnimationPlayback>();
  private readonly eventQueue: SceneEvent[] = [];
  private readonly domEventTypes = new Set<string>(DOM_EVENT_TYPES);
  private readonly runtimeId = `twaframe-${Math.random().toString(36).slice(2)}`;
  private sceneOptions: SceneOptions = {layer: DEFAULT_SCENE_LAYER, mode: '3d'};
  private rootElement: Element | null = null;
  private sceneReadyPending = false;
  private lastEvent: SceneEvent | null = null;
  private readonly runtimeCapability: AFrameRuntimeCapabilityV2;
  private disposed = false;
  private readonly vrms = new VrmAvatars(() => this.getThree() as unknown as VrmThreeApi | null);

  public constructor() {
    this.resetGraph();
    this.runtimeCapability = createRuntimeCapability(
      {
        createScene: (layer, mode) => this.createScene({LAYER: layer, MODE: mode}),
        createNode: (type, id, parent) => this.createNode({TYPE: type, ID: id, PARENT: parent}),
        addClass: (className, selector) => this.addClass({CLASS: className, SELECTOR: selector}),
        loadTemplate: (id, source) => this.loadTemplate({ID: id, SOURCE: source}),
        createFromTemplate: (template, instance, parent) =>
          this.createFromTemplate({TEMPLATE: template, INSTANCE: instance, PARENT: parent}),
        setPosition: (selector, x, y, z) =>
          this.setPosition({SELECTOR: selector, X: x, Y: y, Z: z}),
        setRotation: (selector, x, y, z) =>
          this.setRotation({SELECTOR: selector, X: x, Y: y, Z: z}),
        setAttribute: (selector, name, value) =>
          this.setAttribute({SELECTOR: selector, NAME: name, VALUE: value}),
        setData: (selector, key, value) =>
          this.setData({SELECTOR: selector, KEY: key, VALUE: value}),
        emitEvent: (type, selector, data) =>
          this.emitEvent({TYPE: type, SELECTOR: selector, DATA: data}),
        deleteSelector: (selector) => this.deleteSelector({SELECTOR: selector}),
        countSelector: (selector) => this.countSelector({SELECTOR: selector}),
        loadVrm: (url, selector) => this.loadVrm({URL: url, SELECTOR: selector}),
        setVrmBoneRotation: (selector, bone, x, y, z) =>
          this.setVrmBoneRotation({SELECTOR: selector, BONE: bone, X: x, Y: y, Z: z}),
        vrmBoneNames: (selector) => this.vrmBoneNamesFor(Scratch.Cast.toString(selector)),
        vrmStatus: (selector) => this.vrmStatusFor(Scratch.Cast.toString(selector)),
        setVrmExpression: (selector, name, weight) =>
          this.setVrmExpression({SELECTOR: selector, NAME: name, WEIGHT: weight}),
        vrmExpressionNames: (selector) => this.vrmExpressionNamesFor(Scratch.Cast.toString(selector))
      },
      () => this.assertActive()
    );
    const runtime = Scratch.vm?.runtime;
    if (runtime) runtime[runtimeCapabilityKey] = this.runtimeCapability;
  }

  public getInfo(): Record<string, unknown> {
    return {
      id: extensionConfig.id,
      name: Scratch.translate(definitions.extensionName),
      docsURI: extensionConfig.docsURI,
      blockIconURI: extensionConfig.blockIconURI,
      blocks: blockDefinitions.map((block) => this.toScratchBlock(block))
    };
  }

  public async createScene(args: {LAYER: unknown; MODE: unknown}): Promise<void> {
    await ensureAFrame();
    this.sceneOptions = {
      layer: this.normalizeLayer(Scratch.Cast.toString(args.LAYER)),
      mode: Scratch.Cast.toString(args.MODE) || '3d'
    };
    this.resetGraph();
    this.rootElement = this.createSceneElement();
    const root = this.requireNode(ROOT_ID);
    root.element = this.rootElement;
    this.applyNodeToElement(root);
    this.sceneReadyPending = true;
    this.enqueueEvent({type: 'scene-ready', targetId: ROOT_ID, data: '{}'});
  }

  public loadTemplate(args: {ID: unknown; SOURCE: unknown}): void {
    const id = this.normalizeId(Scratch.Cast.toString(args.ID));
    const template = this.parseTemplate(Scratch.Cast.toString(args.SOURCE));
    this.templates.set(id, template);
  }

  public createNode(args: {TYPE: unknown; ID: unknown; PARENT: unknown}): void {
    const parent = this.firstMatch(Scratch.Cast.toString(args.PARENT)) ?? this.requireNode(ROOT_ID);
    this.addNode(
      {
        type: Scratch.Cast.toString(args.TYPE),
        id: Scratch.Cast.toString(args.ID)
      },
      parent.id
    );
  }

  public createFromTemplate(args: {TEMPLATE: unknown; INSTANCE: unknown; PARENT: unknown}): void {
    const templateId = this.normalizeId(Scratch.Cast.toString(args.TEMPLATE));
    const instanceId = this.normalizeId(Scratch.Cast.toString(args.INSTANCE));
    const template = this.templates.get(templateId);
    if (template === undefined) {
      throw new Error(`Unknown A-Frame template: ${templateId}`);
    }
    const parent = this.firstMatch(Scratch.Cast.toString(args.PARENT)) ?? this.requireNode(ROOT_ID);
    const rootTemplate: TemplateNode = {
      ...template,
      id: instanceId,
      data: {...template.data, template: templateId, instance: instanceId}
    };
    this.addNodeTree(rootTemplate, parent.id, instanceId);
  }

  public setPosition(args: {SELECTOR: unknown; X: unknown; Y: unknown; Z: unknown}): void {
    this.setVec3Attribute(Scratch.Cast.toString(args.SELECTOR), 'position', this.argsToVec3(args));
  }

  public moveBy(args: {SELECTOR: unknown; X: unknown; Y: unknown; Z: unknown}): void {
    const delta = this.argsToVec3(args);
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      const current = this.parseVec3(node.attributes.get('position'));
      this.setVec3(node, 'position', {
        x: current.x + delta.x,
        y: current.y + delta.y,
        z: current.z + delta.z
      });
    }
  }

  public setRotation(args: {SELECTOR: unknown; X: unknown; Y: unknown; Z: unknown}): void {
    this.setVec3Attribute(Scratch.Cast.toString(args.SELECTOR), 'rotation', this.argsToVec3(args));
  }

  public addClass(args: {CLASS: unknown; SELECTOR: unknown}): void {
    const className = this.normalizeToken(Scratch.Cast.toString(args.CLASS));
    if (className.length === 0) return;
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      node.classes.add(className);
      this.applyNodeToElement(node);
    }
  }

  public setData(args: {SELECTOR: unknown; KEY: unknown; VALUE: unknown}): void {
    const key = this.normalizeDataKey(Scratch.Cast.toString(args.KEY));
    const value = Scratch.Cast.toString(args.VALUE);
    if (key.length === 0) return;
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      node.data.set(key, value);
      this.applyNodeToElement(node);
    }
  }

  public setAttribute(args: {SELECTOR: unknown; NAME: unknown; VALUE: unknown}): void {
    const name = this.normalizeAttributeName(Scratch.Cast.toString(args.NAME));
    const value = Scratch.Cast.toString(args.VALUE);
    if (name.length === 0) return;
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      node.attributes.set(name, value);
      this.applyNodeToElement(node);
    }
  }

  public deleteSelector(args: {SELECTOR: unknown}): void {
    const targets = this.matches(Scratch.Cast.toString(args.SELECTOR)).filter(
      (node) => node.id !== ROOT_ID
    );
    for (const node of targets) {
      if (this.nodes.has(node.id)) {
        this.deleteNode(node.id);
      }
    }
  }

  public countSelector(args: {SELECTOR: unknown}): number {
    return this.matches(Scratch.Cast.toString(args.SELECTOR)).length;
  }

  public eventTargetId(): string {
    return this.lastEvent?.targetId ?? '';
  }

  public emitEvent(args: {TYPE: unknown; SELECTOR: unknown; DATA: unknown}): void {
    const target = this.firstMatch(Scratch.Cast.toString(args.SELECTOR));
    if (target === undefined) return;
    this.enqueueEvent({
      type: Scratch.Cast.toString(args.TYPE),
      targetId: target.id,
      data: Scratch.Cast.toString(args.DATA)
    });
  }

  public whenSceneReady(): boolean {
    if (!this.sceneReadyPending) return false;
    this.sceneReadyPending = false;
    this.lastEvent = {type: 'scene-ready', targetId: ROOT_ID, data: '{}'};
    return true;
  }

  public whenEventOnSelector(args: {TYPE: unknown; SELECTOR: unknown}): boolean {
    const type = Scratch.Cast.toString(args.TYPE);
    const selector = Scratch.Cast.toString(args.SELECTOR);
    this.domEventTypes.add(type);
    this.attachDomEventType(type);
    const index = this.eventQueue.findIndex((event) => {
      if (event.type !== type) return false;
      const target = this.nodes.get(event.targetId);
      return target !== undefined && this.matchesSelector(target, selector);
    });
    if (index < 0) return false;
    const [event] = this.eventQueue.splice(index, 1);
    this.lastEvent = event ?? null;
    return event !== undefined;
  }

  public createAnimationClip(args: {NAME: unknown; DURATION: unknown}): void {
    const name = this.normalizeId(Scratch.Cast.toString(args.NAME));
    const duration = Scratch.Cast.toNumber(args.DURATION);
    if (!Number.isFinite(duration) || duration < -1) {
      throw new TypeError('Animation clip duration must be -1 or a non-negative number.');
    }
    this.stopClipEverywhere(name);
    this.animationClips.set(name, {
      name,
      duration,
      tracks: []
    });
  }

  public deleteAnimationClip(args: {NAME: unknown}): void {
    const name = this.normalizeId(Scratch.Cast.toString(args.NAME));
    this.stopClipEverywhere(name);
    this.animationClips.delete(name);
  }

  public addVectorKeyframeTrack(args: {
    CLIP: unknown;
    PATH: unknown;
    TIMES: unknown;
    VALUES: unknown;
  }): void {
    this.addKeyframeTrack(args, 'vector');
  }

  public addQuaternionKeyframeTrack(args: {
    CLIP: unknown;
    PATH: unknown;
    TIMES: unknown;
    VALUES: unknown;
  }): void {
    this.addKeyframeTrack(args, 'quaternion');
  }

  public addEulerRotationKeyframeTrack(args: {
    CLIP: unknown;
    PATH: unknown;
    TIMES: unknown;
    VALUES: unknown;
    UNIT: unknown;
  }): void {
    const times = this.parseNumberList(Scratch.Cast.toString(args.TIMES), 'times');
    const eulerValues = this.parseNumberList(Scratch.Cast.toString(args.VALUES), 'values');
    this.validateTrackNumbers(times, eulerValues, 3);
    const unit = this.normalizeEulerUnit(Scratch.Cast.toString(args.UNIT));
    const values: number[] = [];
    for (let index = 0; index < eulerValues.length; index += 3) {
      values.push(
        ...this.eulerToQuaternion(
          eulerValues[index] ?? 0,
          eulerValues[index + 1] ?? 0,
          eulerValues[index + 2] ?? 0,
          unit
        )
      );
    }
    this.pushKeyframeTrack({
      clipName: this.normalizeId(Scratch.Cast.toString(args.CLIP)),
      path: Scratch.Cast.toString(args.PATH),
      trackType: 'quaternion',
      times,
      values
    });
  }

  public addPositionKeyframe(args: {
    CLIP: unknown;
    TIME: unknown;
    X: unknown;
    Y: unknown;
    Z: unknown;
  }): void {
    this.insertVectorKeyframe(args, '.position');
  }

  public addScaleKeyframe(args: {
    CLIP: unknown;
    TIME: unknown;
    X: unknown;
    Y: unknown;
    Z: unknown;
  }): void {
    this.insertVectorKeyframe(args, '.scale');
  }

  public addEulerRotationKeyframe(args: {
    CLIP: unknown;
    TIME: unknown;
    X: unknown;
    Y: unknown;
    Z: unknown;
    UNIT: unknown;
  }): void {
    const unit = this.normalizeEulerUnit(Scratch.Cast.toString(args.UNIT));
    this.insertKeyframe({
      clipName: this.normalizeId(Scratch.Cast.toString(args.CLIP)),
      path: '.quaternion',
      trackType: 'quaternion',
      time: Scratch.Cast.toNumber(args.TIME),
      values: this.eulerToQuaternion(
        Scratch.Cast.toNumber(args.X),
        Scratch.Cast.toNumber(args.Y),
        Scratch.Cast.toNumber(args.Z),
        unit
      )
    });
  }

  public playAnimationClip(args: {CLIP: unknown; SELECTOR: unknown; LOOP: unknown}): void {
    const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
    const clip = this.requireAnimationClip(clipName);
    if (clip.tracks.length === 0) {
      throw new Error(`3D animation clip has no keyframe tracks: ${clipName}`);
    }
    const loop = Scratch.Cast.toBoolean(args.LOOP);
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      const playback = this.createPlayback(node, clip, loop);
      this.animationPlaybacks.set(this.playbackKey(node.id, clipName), playback);
    }
    this.ensureAnimationTickBridge();
  }

  public stopAnimationClip(args: {CLIP: unknown; SELECTOR: unknown}): void {
    const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      this.stopPlayback(this.playbackKey(node.id, clipName), true);
    }
  }

  public pauseAnimationClip(args: {CLIP: unknown; SELECTOR: unknown}): void {
    const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      const playback = this.animationPlaybacks.get(this.playbackKey(node.id, clipName));
      if (playback === undefined) continue;
      playback.paused = true;
      if (playback.action !== null) {
        playback.action.paused = true;
      }
    }
  }

  public resumeAnimationClip(args: {CLIP: unknown; SELECTOR: unknown}): void {
    const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      const playback = this.animationPlaybacks.get(this.playbackKey(node.id, clipName));
      if (playback === undefined || !playback.active) continue;
      playback.paused = false;
      if (playback.action !== null) {
        playback.action.paused = false;
        playback.action.play?.();
      }
    }
  }

  public setAnimationTimeScale(args: {CLIP: unknown; SELECTOR: unknown; SCALE: unknown}): void {
    const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
    const scale = Scratch.Cast.toNumber(args.SCALE);
    if (!Number.isFinite(scale)) {
      throw new TypeError('Animation time scale must be a finite number.');
    }
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      const playback = this.animationPlaybacks.get(this.playbackKey(node.id, clipName));
      if (playback === undefined) continue;
      playback.timeScale = scale;
      if (playback.action !== null) {
        playback.action.timeScale = scale;
      }
    }
  }

  public isAnimationClipPlaying(args: {CLIP: unknown; SELECTOR: unknown}): boolean {
    const clipName = this.normalizeId(Scratch.Cast.toString(args.CLIP));
    return this.matches(Scratch.Cast.toString(args.SELECTOR)).some((node) => {
      const playback = this.animationPlaybacks.get(this.playbackKey(node.id, clipName));
      return playback?.active === true && playback.paused === false;
    });
  }

  public async loadVrm(args: {URL: unknown; SELECTOR: unknown}): Promise<void> {
    const selector = Scratch.Cast.toString(args.SELECTOR);
    const node = this.firstMatch(selector);
    if (node === undefined) throw new Error(`No A-Frame node matches: ${selector}`);
    const element = node.element as (Element & VrmHostElement) | null;
    if (element === null) throw new Error('VRM avatars need a scene in the browser.');
    this.ensureAnimationTickBridge();
    await this.vrms.load(node.id, Scratch.Cast.toString(args.URL), (scene) => {
      if (element.setObject3D !== undefined) {
        element.setObject3D('vrm', scene);
      } else {
        element.object3D?.add(scene);
      }
    });
  }

  public setVrmBoneRotation(args: {
    SELECTOR: unknown;
    BONE: unknown;
    X: unknown;
    Y: unknown;
    Z: unknown;
  }): void {
    const bone = Scratch.Cast.toString(args.BONE).trim();
    const rotation = this.argsToVec3(args);
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      if (this.vrms.state(node.id) !== 'ready') continue;
      this.vrms.setBoneRotation(node.id, bone, rotation);
    }
  }

  public setVrmExpression(args: {SELECTOR: unknown; NAME: unknown; WEIGHT: unknown}): void {
    const name = Scratch.Cast.toString(args.NAME).trim();
    const weight = Scratch.Cast.toNumber(args.WEIGHT);
    for (const node of this.matches(Scratch.Cast.toString(args.SELECTOR))) {
      if (this.vrms.state(node.id) !== 'ready') continue;
      this.vrms.setExpression(node.id, name, weight);
    }
  }

  public vrmExpressionNames(args: {SELECTOR: unknown}): string {
    return JSON.stringify(this.vrmExpressionNamesFor(Scratch.Cast.toString(args.SELECTOR)));
  }

  public vrmBoneNames(args: {SELECTOR: unknown}): string {
    return JSON.stringify(this.vrmBoneNamesFor(Scratch.Cast.toString(args.SELECTOR)));
  }

  public vrmState(args: {SELECTOR: unknown}): string {
    const {state, error} = this.vrmStatusFor(Scratch.Cast.toString(args.SELECTOR));
    return state === 'error' ? `error: ${error}` : state;
  }

  public testStepAnimations(args: {DELTA: unknown}): void {
    this.updateFrame(Scratch.Cast.toNumber(args.DELTA) / 1000);
  }

  public snapshot(): Record<string, unknown> {
    return {
      options: this.sceneOptions,
      animationClips: [...this.animationClips.values()].map((clip) => ({
        name: clip.name,
        duration: clip.duration,
        tracks: clip.tracks.map((track) => ({
          type: track.type,
          path: track.path,
          times: [...track.times],
          values: [...track.values]
        }))
      })),
      animationPlaybacks: [...this.animationPlaybacks.values()].map((playback) => ({
        nodeId: playback.nodeId,
        clipName: playback.clipName,
        loop: playback.loop,
        active: playback.active,
        playing: playback.active && !playback.paused,
        paused: playback.paused,
        timeScale: playback.timeScale,
        hasMixer: playback.mixer !== null
      })),
      nodes: [...this.nodes.values()].map((node) => ({
        id: node.id,
        type: node.type,
        parentId: node.parentId,
        children: [...node.children],
        classes: [...node.classes].sort(),
        data: Object.fromEntries([...node.data.entries()].sort()),
        attributes: Object.fromEntries([...node.attributes.entries()].sort())
      }))
    };
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const key of [...this.animationPlaybacks.keys()]) {
      this.stopPlayback(key, true);
    }
    this.vrms.clear();
    this.rootElement?.parentElement?.remove();
    this.rootElement = null;
    const runtime = Scratch.vm?.runtime;
    if (runtime?.[runtimeCapabilityKey] === this.runtimeCapability) {
      delete runtime[runtimeCapabilityKey];
    }
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error('A-Frame runtime capability is disposed.');
    }
  }

  private resetGraph(): void {
    for (const key of [...this.animationPlaybacks.keys()]) {
      this.stopPlayback(key, true);
    }
    this.vrms.clear();
    this.nodes.clear();
    this.nodes.set(ROOT_ID, {
      id: ROOT_ID,
      type: 'scene',
      parentId: null,
      children: [],
      classes: new Set(),
      data: new Map(),
      attributes: new Map([
        ['embedded', 'true'],
        ['renderer', 'alpha: true']
      ]),
      element: null
    });
    this.eventQueue.length = 0;
    this.lastEvent = null;
  }

  private addNodeTree(template: TemplateNode, parentId: string, fallbackId: string): SceneNode {
    const node = this.addNode({...template, id: fallbackId}, parentId);
    for (const [index, child] of (template.children ?? []).entries()) {
      const childId = child.id ?? child.type ?? String(index + 1);
      this.addNodeTree(child, node.id, `${node.id}-${this.normalizeId(childId)}`);
    }
    return node;
  }

  private addNode(template: TemplateNode, parentId: string): SceneNode {
    const id = this.normalizeId(template.id ?? template.type ?? 'node');
    if (id === ROOT_ID || this.nodes.has(id)) {
      throw new Error(`Duplicate A-Frame node id: ${id}`);
    }
    const parent = this.requireNode(parentId);
    const node: SceneNode = {
      id,
      type: this.normalizeNodeType(template.type ?? 'group'),
      parentId,
      children: [],
      classes: new Set(this.normalizeClasses(template)),
      data: new Map(this.normalizeRecord(template.data, this.normalizeDataKey.bind(this))),
      attributes: new Map(
        this.normalizeRecord(template.attributes, this.normalizeAttributeName.bind(this))
      ),
      element: this.createElementForType(template.type ?? 'group')
    };
    this.nodes.set(id, node);
    parent.children.push(id);
    this.attachElement(parent, node);
    this.attachNodeEventListeners(node);
    this.applyNodeToElement(node);
    return node;
  }

  private deleteNode(id: string): void {
    const node = this.requireNode(id);
    for (const childId of [...node.children]) {
      this.deleteNode(childId);
    }
    if (node.parentId !== null) {
      const parent = this.requireNode(node.parentId);
      parent.children = parent.children.filter((childId) => childId !== id);
    }
    node.element?.remove();
    this.nodes.delete(id);
    this.vrms.remove(id);
    for (const key of [...this.animationPlaybacks.keys()]) {
      if (key.startsWith(`${id}:`)) {
        this.stopPlayback(key, true);
      }
    }
  }

  private matches(selector: string): SceneNode[] {
    const normalized = selector.trim();
    if (normalized.length === 0 || normalized === '*') return [...this.nodes.values()];
    return [...this.nodes.values()].filter((node) => this.matchesSelector(node, normalized));
  }

  private firstMatch(selector: string): SceneNode | undefined {
    return this.matches(selector)[0];
  }

  private matchesSelector(node: SceneNode, selector: string): boolean {
    if (selector === '@event' || selector === 'event target') {
      return this.lastEvent?.targetId === node.id;
    }
    if (selector.startsWith('#')) return node.id === this.normalizeId(selector.slice(1));
    if (selector.startsWith('.')) return node.classes.has(this.normalizeToken(selector.slice(1)));
    const dataMatch = selector.match(/^\[data-([a-zA-Z0-9_-]+)=["']?([^"'\]]+)["']?\]$/);
    if (dataMatch !== null) {
      const [, key, value] = dataMatch;
      return node.data.get(this.normalizeDataKey(key ?? '')) === value;
    }
    return node.id === this.normalizeId(selector);
  }

  private enqueueEvent(event: SceneEvent): void {
    this.pushEvent(event);
    const target = this.nodes.get(event.targetId);
    const element = target?.element;
    if (element !== null && element !== undefined) {
      element.dispatchEvent(
        new CustomEvent(event.type, {
          detail: {data: event.data, targetId: event.targetId, twAframeSynthetic: true}
        })
      );
    }
  }

  private pushEvent(event: SceneEvent): void {
    this.eventQueue.push(event);
  }

  private createSceneElement(): Element | null {
    if (typeof document === 'undefined') return null;
    const existing = document.getElementById('tw-aframe-root');
    existing?.remove();

    const host = document.createElement('div');
    host.id = 'tw-aframe-root';
    host.dataset['twAframeLayer'] = this.sceneOptions.layer;
    host.dataset['twAframeMode'] = this.sceneOptions.mode;
    host.style.position = 'absolute';
    host.style.inset = '0';
    host.style.pointerEvents = 'auto';
    host.style.zIndex = SCENE_HOST_Z_INDEX[this.sceneOptions.layer];

    const scene = document.createElement('a-scene');
    host.append(scene);
    const mount = this.findStageMount();
    mount.append(host);
    return scene;
  }

  private createElementForType(type: string): Element | null {
    if (typeof document === 'undefined') return null;
    return document.createElement(this.tagForType(this.normalizeNodeType(type)));
  }

  private attachElement(parent: SceneNode, child: SceneNode): void {
    if (parent.element === null || child.element === null) return;
    parent.element.append(child.element);
  }

  private attachDomEventType(type: string): void {
    for (const node of this.nodes.values()) {
      this.attachNodeEventListener(node, type);
    }
  }

  private attachNodeEventListeners(node: SceneNode): void {
    for (const type of this.domEventTypes) {
      this.attachNodeEventListener(node, type);
    }
  }

  private attachNodeEventListener(node: SceneNode, type: string): void {
    const element = node.element;
    if (element === null) return;
    const listenerKey = `twAframeListener${type}`;
    const elementWithState = element as Element & Record<string, boolean>;
    if (elementWithState[listenerKey]) return;
    element.addEventListener(type, (event) => {
      if (event.target !== element) return;
      const detail = this.eventDetail(event);
      if (detail['twAframeSynthetic'] === true) return;
      this.pushEvent({
        type,
        targetId: node.id,
        data: JSON.stringify(detail)
      });
    });
    elementWithState[listenerKey] = true;
  }

  private eventDetail(event: Event): Record<string, unknown> {
    if ('detail' in event && typeof event.detail === 'object' && event.detail !== null) {
      return event.detail as Record<string, unknown>;
    }
    return {};
  }

  private findStageMount(): HTMLElement {
    const selectors = [
      '[class*="stage_stage-wrapper"]',
      '[class*="stage-wrapper"]',
      '[class*="stage"]',
      '#scratch-stage',
      'canvas'
    ];
    for (const selector of selectors) {
      const match = document.querySelector(selector);
      const mount = match instanceof HTMLCanvasElement ? match.parentElement : match;
      if (mount instanceof HTMLElement) {
        const style = getComputedStyle(mount);
        if (style.position === 'static') {
          mount.style.position = 'relative';
        }
        return mount;
      }
    }
    return document.body;
  }

  private applyNodeToElement(node: SceneNode): void {
    if (node.element === null) return;
    node.element.id = node.id;
    node.element.setAttribute('class', [...node.classes].sort().join(' '));
    for (const [key, value] of node.data) {
      node.element.setAttribute(`data-${key}`, value);
    }
    for (const [name, value] of node.attributes) {
      node.element.setAttribute(name, value);
    }
  }

  private addKeyframeTrack(
    args: {CLIP: unknown; PATH: unknown; TIMES: unknown; VALUES: unknown},
    trackType: KeyframeTrackType
  ): void {
    const times = this.parseNumberList(Scratch.Cast.toString(args.TIMES), 'times');
    const values = this.parseNumberList(Scratch.Cast.toString(args.VALUES), 'values');
    this.validateTrackNumbers(times, values, trackType === 'vector' ? 3 : 4);
    this.pushKeyframeTrack({
      clipName: this.normalizeId(Scratch.Cast.toString(args.CLIP)),
      path: Scratch.Cast.toString(args.PATH),
      trackType,
      times,
      values
    });
  }

  private insertVectorKeyframe(
    args: {CLIP: unknown; TIME: unknown; X: unknown; Y: unknown; Z: unknown},
    path: '.position' | '.scale'
  ): void {
    this.insertKeyframe({
      clipName: this.normalizeId(Scratch.Cast.toString(args.CLIP)),
      path,
      trackType: 'vector',
      time: Scratch.Cast.toNumber(args.TIME),
      values: [
        Scratch.Cast.toNumber(args.X),
        Scratch.Cast.toNumber(args.Y),
        Scratch.Cast.toNumber(args.Z)
      ]
    });
  }

  private insertKeyframe({
    clipName,
    path,
    trackType,
    time,
    values
  }: {
    clipName: string;
    path: string;
    trackType: KeyframeTrackType;
    time: number;
    values: readonly number[];
  }): void {
    if (!Number.isFinite(time) || time < 0) {
      throw new TypeError('Animation keyframe time must be a non-negative number.');
    }
    if (values.some((value) => !Number.isFinite(value))) {
      throw new TypeError('Animation keyframe values must be finite numbers.');
    }
    const stride = trackType === 'vector' ? 3 : 4;
    if (values.length !== stride) {
      throw new TypeError(`Animation keyframe must contain ${stride} values.`);
    }
    const clip = this.requireAnimationClip(clipName);
    const normalizedPath = this.normalizeTrackPath(path, trackType);
    let track = clip.tracks.find(
      (item) => item.type === trackType && item.path === normalizedPath
    );
    if (track === undefined) {
      track = {type: trackType, path: normalizedPath, times: [], values: []};
      clip.tracks.push(track);
    }
    const insertAt = track.times.findIndex((existingTime) => existingTime >= time);
    const valueInsertAt = (insertAt < 0 ? track.times.length : insertAt) * stride;
    if (insertAt >= 0 && track.times[insertAt] === time) {
      track.values.splice(valueInsertAt, stride, ...values);
      return;
    }
    const timeInsertAt = insertAt < 0 ? track.times.length : insertAt;
    track.times.splice(timeInsertAt, 0, time);
    track.values.splice(valueInsertAt, 0, ...values);
  }

  private pushKeyframeTrack({
    clipName,
    path,
    trackType,
    times,
    values
  }: {
    clipName: string;
    path: string;
    trackType: KeyframeTrackType;
    times: number[];
    values: number[];
  }): void {
    const clip = this.requireAnimationClip(clipName);
    const normalizedPath = this.normalizeTrackPath(path, trackType);
    clip.tracks.push({
      type: trackType,
      path: normalizedPath,
      times: [...times],
      values: [...values]
    });
  }

  private parseNumberList(source: string, label: string): number[] {
    const trimmed = source.trim();
    if (trimmed.length === 0) {
      throw new TypeError(`Animation ${label} must contain at least one number.`);
    }
    const values = trimmed
      .split(/[\s,]+/)
      .filter((part) => part.length > 0)
      .map((part) => Number(part));
    if (values.length === 0 || values.some((value) => !Number.isFinite(value))) {
      throw new TypeError(`Animation ${label} must contain only finite numbers.`);
    }
    return values;
  }

  private validateTrackNumbers(times: number[], values: number[], stride: number): void {
    if (times.length === 0) {
      throw new TypeError('Animation track times must not be empty.');
    }
    for (let index = 1; index < times.length; index += 1) {
      if ((times[index] ?? 0) < (times[index - 1] ?? 0)) {
        throw new TypeError('Animation track times must be sorted in ascending order.');
      }
    }
    const expectedValues = times.length * stride;
    if (values.length !== expectedValues) {
      throw new TypeError(
        `Animation track values length must be ${expectedValues} for ${times.length} keyframes.`
      );
    }
  }

  private normalizeTrackPath(path: string, trackType: KeyframeTrackType): string {
    const normalized = path.trim();
    const allowed =
      trackType === 'vector' ? new Set(['.position', '.scale']) : new Set(['.quaternion']);
    if (!allowed.has(normalized)) {
      throw new TypeError(
        `Animation ${trackType} track path must be one of: ${[...allowed].join(', ')}.`
      );
    }
    return normalized;
  }

  private eulerToQuaternion(
    x: number,
    y: number,
    z: number,
    unit: 'degrees' | 'radians'
  ): [number, number, number, number] {
    const scale = unit === 'degrees' ? Math.PI / 180 : 1;
    const halfX = (x * scale) / 2;
    const halfY = (y * scale) / 2;
    const halfZ = (z * scale) / 2;
    const c1 = Math.cos(halfX);
    const c2 = Math.cos(halfY);
    const c3 = Math.cos(halfZ);
    const s1 = Math.sin(halfX);
    const s2 = Math.sin(halfY);
    const s3 = Math.sin(halfZ);
    return [
      s1 * c2 * c3 + c1 * s2 * s3,
      c1 * s2 * c3 - s1 * c2 * s3,
      c1 * c2 * s3 + s1 * s2 * c3,
      c1 * c2 * c3 - s1 * s2 * s3
    ];
  }

  private normalizeEulerUnit(value: string): 'degrees' | 'radians' {
    const unit = value.trim().toLowerCase();
    if (unit !== 'radians' && unit !== 'degrees') {
      throw new TypeError('Euler rotation keyframe unit must be radians or degrees.');
    }
    return unit;
  }

  private createPlayback(
    node: SceneNode,
    clip: AnimationClipDefinition,
    loop: boolean
  ): AnimationPlayback {
    const key = this.playbackKey(node.id, clip.name);
    this.stopPlayback(key, true);
    const playback: AnimationPlayback = {
      nodeId: node.id,
      clipName: clip.name,
      loop,
      active: false,
      paused: false,
      timeScale: 1,
      mixer: null,
      action: null
    };
    const mixer = this.createMixer(node, clip, loop);
    if (mixer !== null) {
      playback.mixer = mixer.mixer;
      playback.action = mixer.action;
      playback.active = true;
    }
    return playback;
  }

  private createMixer(
    node: SceneNode,
    clip: AnimationClipDefinition,
    loop: boolean
  ): {mixer: AnimationMixerLike; action: AnimationActionLike} | null {
    const object3D = this.object3DForNode(node);
    const THREE = this.getThree();
    if (object3D === null || THREE === null) return null;
    const threeClip = this.toThreeAnimationClip(THREE, clip);
    const mixer = new THREE.AnimationMixer(object3D);
    const action = mixer.clipAction(threeClip);
    if (action.setLoop !== undefined) {
      action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    }
    action.paused = false;
    action.timeScale = 1;
    action.play?.();
    return {mixer, action};
  }

  private toThreeAnimationClip(THREE: ThreeAnimationApi, clip: AnimationClipDefinition): unknown {
    const tracks = clip.tracks.map((track) => {
      if (track.type === 'vector') {
        return new THREE.VectorKeyframeTrack(track.path, track.times, track.values);
      }
      return new THREE.QuaternionKeyframeTrack(track.path, track.times, track.values);
    });
    return new THREE.AnimationClip(clip.name, clip.duration, tracks);
  }

  private object3DForNode(node: SceneNode): unknown | null {
    const element = node.element as (Element & {object3D?: unknown}) | null;
    return element?.object3D ?? null;
  }

  private stopPlayback(key: string, remove: boolean): void {
    const playback = this.animationPlaybacks.get(key);
    if (playback === undefined) return;
    playback.action?.stop?.();
    playback.mixer?.stopAllAction?.();
    playback.active = false;
    playback.paused = false;
    if (remove) {
      this.animationPlaybacks.delete(key);
    }
  }

  private stopClipEverywhere(clipName: string): void {
    for (const [key, playback] of [...this.animationPlaybacks.entries()]) {
      if (playback.clipName === clipName) {
        this.stopPlayback(key, true);
      }
    }
  }

  private vrmBoneNamesFor(selector: string): string[] {
    const node = this.firstMatch(selector);
    return node === undefined ? [] : this.vrms.boneNames(node.id);
  }

  private vrmExpressionNamesFor(selector: string): string[] {
    const node = this.firstMatch(selector);
    return node === undefined ? [] : this.vrms.expressionNames(node.id);
  }

  private vrmStatusFor(selector: string): AFrameVrmStatus {
    const node = this.firstMatch(selector);
    if (node === undefined) return {state: 'none', error: ''};
    return {state: this.vrms.state(node.id), error: this.vrms.error(node.id)};
  }

  private updateFrame(deltaTime: number): void {
    this.updateAnimationMixers(deltaTime);
    if (Number.isFinite(deltaTime) && deltaTime >= 0) this.vrms.update(deltaTime);
  }

  private updateAnimationMixers(deltaTime: number): void {
    if (!Number.isFinite(deltaTime) || deltaTime < 0) return;
    for (const playback of this.animationPlaybacks.values()) {
      if (!playback.active || playback.paused) continue;
      playback.mixer?.update(deltaTime * playback.timeScale);
    }
  }

  private ensureAnimationTickBridge(): void {
    const scene = this.rootElement;
    if (scene === null || this.getThree() === null) return;
    const AFRAME = this.getAFrame();
    if (AFRAME === null) return;
    const runtimes = this.animationRuntimeRegistry();
    runtimes.set(this.runtimeId, this);
    if (AFRAME.components?.['tw-animation-runtime'] === undefined) {
      AFRAME.registerComponent('tw-animation-runtime', {
        schema: {id: {type: 'string'}},
        tick(this: {data: {id: string}}, _time: number, timeDelta: number) {
          const extension = animationRuntimeRegistry().get(this.data.id);
          extension?.updateFrame(timeDelta / 1000);
        }
      });
    }
    scene.setAttribute('tw-animation-runtime', `id: ${this.runtimeId}`);
  }

  private animationRuntimeRegistry(): Map<string, TurboWarpAFrameExtension> {
    return animationRuntimeRegistry();
  }

  private getAFrame(): AFrameApi | null {
    const value = (globalThis as {AFRAME?: AFrameApi}).AFRAME;
    return value ?? null;
  }

  private getThree(): ThreeAnimationApi | null {
    return this.getAFrame()?.THREE ?? null;
  }

  private playbackKey(nodeId: string, clipName: string): string {
    return `${nodeId}:${clipName}`;
  }

  private requireAnimationClip(name: string): AnimationClipDefinition {
    const clip = this.animationClips.get(name);
    if (clip === undefined) {
      throw new Error(`Unknown 3D animation clip: ${name}`);
    }
    return clip;
  }

  private setVec3Attribute(selector: string, name: string, value: Vec3): void {
    for (const node of this.matches(selector)) {
      this.setVec3(node, name, value);
    }
  }

  private setVec3(node: SceneNode, name: string, value: Vec3): void {
    node.attributes.set(name, `${value.x} ${value.y} ${value.z}`);
    this.applyNodeToElement(node);
  }

  private argsToVec3(args: {X: unknown; Y: unknown; Z: unknown}): Vec3 {
    return {
      x: Scratch.Cast.toNumber(args.X),
      y: Scratch.Cast.toNumber(args.Y),
      z: Scratch.Cast.toNumber(args.Z)
    };
  }

  private parseVec3(value: string | undefined): Vec3 {
    if (value === undefined) return {x: 0, y: 0, z: 0};
    const [x = 0, y = 0, z = 0] = value.split(/\s+/).map((part) => Number(part));
    return {x, y, z};
  }

  private parseTemplate(source: string): TemplateNode {
    const value: unknown = JSON.parse(source);
    this.validateTemplateNode(value, 'template');
    return value as TemplateNode;
  }

  private validateTemplateNode(value: unknown, path: string): asserts value is TemplateNode {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError(`A-Frame ${path} must be an object.`);
    }
    const node = value as Record<string, unknown>;
    for (const key of Object.keys(node)) {
      if (!TEMPLATE_NODE_KEYS.has(key)) {
        throw new TypeError(`A-Frame ${path}.${key} is not supported.`);
      }
    }
    this.validateOptionalString(node['type'], `${path}.type`);
    this.validateOptionalString(node['id'], `${path}.id`);
    this.validateTemplateClass(node['class'], `${path}.class`);
    this.validateOptionalStringArray(node['classes'], `${path}.classes`);
    this.validateStringRecord(node['data'], `${path}.data`);
    this.validateStringRecord(node['attributes'], `${path}.attributes`);
    const children = node['children'];
    if (children === undefined) return;
    if (!Array.isArray(children)) {
      throw new TypeError(`A-Frame ${path}.children must be an array.`);
    }
    children.forEach((child, index) => {
      this.validateTemplateNode(child, `${path}.children[${index}]`);
    });
  }

  private validateTemplateClass(value: unknown, path: string): void {
    if (value === undefined || typeof value === 'string') return;
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return;
    throw new TypeError(`A-Frame ${path} must be a string or string array.`);
  }

  private validateOptionalStringArray(value: unknown, path: string): void {
    if (value === undefined) return;
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return;
    throw new TypeError(`A-Frame ${path} must be a string array.`);
  }

  private validateOptionalString(value: unknown, path: string): void {
    if (value === undefined || typeof value === 'string') return;
    throw new TypeError(`A-Frame ${path} must be a string.`);
  }

  private validateStringRecord(value: unknown, path: string): void {
    if (value === undefined) return;
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError(`A-Frame ${path} must be an object.`);
    }
    for (const [key, recordValue] of Object.entries(value)) {
      if (key.trim().length === 0) {
        throw new TypeError(`A-Frame ${path} keys must be non-empty strings.`);
      }
      if (recordValue === undefined) {
        throw new TypeError(`A-Frame ${path}.${key} must not be undefined.`);
      }
    }
  }

  private normalizeClasses(template: TemplateNode): string[] {
    const classes = [
      ...(Array.isArray(template.class) ? template.class : String(template.class ?? '').split(/\s+/)),
      ...(template.classes ?? [])
    ];
    return classes.map((value) => this.normalizeToken(value)).filter((value) => value.length > 0);
  }

  private normalizeRecord(
    value: Record<string, unknown> | undefined,
    normalizeKey: (key: string) => string
  ): Array<[string, string]> {
    return Object.entries(value ?? {}).map(([key, recordValue]) => [
      normalizeKey(key),
      String(recordValue)
    ]);
  }

  private normalizeNodeType(value: string): string {
    const type = this.normalizeToken(value);
    return type.length === 0 ? 'group' : type;
  }

  private normalizeId(value: string): string {
    return this.normalizeToken(value) || 'node';
  }

  /**
   * Blocks take whatever string a project hands them, so an unknown layer falls back to the default
   * rather than stopping the script, and never reaches the host as a value it cannot honor.
   */
  private normalizeLayer(value: string): SceneLayer {
    const layer = value.trim() as SceneLayer;
    return SCENE_LAYERS.includes(layer) ? layer : DEFAULT_SCENE_LAYER;
  }

  private normalizeToken(value: string): string {
    return value.trim().replace(/[^a-zA-Z0-9_-]/g, '-');
  }

  private normalizeDataKey(value: string): string {
    return this.normalizeToken(value).toLowerCase();
  }

  private normalizeAttributeName(value: string): string {
    return value.trim().replace(/[^a-zA-Z0-9_:-]/g, '-');
  }

  private tagForType(type: string): string {
    const tags: Record<string, string> = {
      box: 'a-box',
      camera: 'a-camera',
      circle: 'a-circle',
      cone: 'a-cone',
      cylinder: 'a-cylinder',
      empty: 'a-entity',
      group: 'a-entity',
      image: 'a-image',
      'image-plane': 'a-image',
      light: 'a-light',
      model: 'a-entity',
      plane: 'a-plane',
      primitive: 'a-entity',
      scene: 'a-scene',
      sphere: 'a-sphere',
      text: 'a-text'
    };
    return tags[type] ?? 'a-entity';
  }

  private requireNode(id: string): SceneNode {
    const node = this.nodes.get(id);
    if (node === undefined) {
      throw new Error(`Unknown A-Frame node: ${id}`);
    }
    return node;
  }

  private toScratchBlock(block: BlockDefinition): Record<string, unknown> {
    return {
      opcode: block.opcode,
      blockType: Scratch.BlockType[block.blockType],
      text: Scratch.translate(block.text),
      arguments: Object.fromEntries(
        Object.entries(block.arguments).map(([name, argument]) => [
          name,
          {
            type: Scratch.ArgumentType[argument.type],
            defaultValue: argument.defaultValue
          }
        ])
      )
    };
  }
}

function animationRuntimeRegistry(): Map<string, TurboWarpAFrameExtension> {
  const globalState = globalThis as {
    __twAframeAnimationRuntimes?: Map<string, TurboWarpAFrameExtension>;
  };
  globalState.__twAframeAnimationRuntimes ??= new Map();
  return globalState.__twAframeAnimationRuntimes;
}
