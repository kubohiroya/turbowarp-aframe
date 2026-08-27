import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {TurboWarpAFrameExtension} from '../src/extension.js';

class FakeElement {
  public readonly tagName: string;
  public readonly children: FakeElement[] = [];
  public readonly dataset: Record<string, string> = {};
  public readonly object3D: Record<string, unknown> = {};
  public readonly style: Record<string, string> = {};
  public parentElement: FakeElement | null = null;
  public attributes: Record<string, string> = {};
  private readonly listeners = new Map<string, Array<(event: {target: FakeElement; detail?: unknown}) => void>>();
  private elementId = '';

  public constructor(tagName: string) {
    this.tagName = tagName;
  }

  public get id(): string {
    return this.elementId;
  }

  public set id(value: string) {
    this.elementId = value;
  }

  public append(child: FakeElement): void {
    child.parentElement = this;
    this.children.push(child);
  }

  public remove(): void {
    if (this.parentElement === null) return;
    this.parentElement.children.splice(this.parentElement.children.indexOf(this), 1);
    this.parentElement = null;
  }

  public setAttribute(name: string, value: string): void {
    this.attributes[name] = value;
  }

  public addEventListener(
    type: string,
    listener: (event: {target: FakeElement; detail?: unknown}) => void
  ): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  public dispatchEvent(event: {type: string; detail?: unknown}): boolean {
    for (const listener of this.listeners.get(event.type) ?? []) {
      listener({target: this, detail: event.detail});
    }
    return true;
  }
}

class FakeCanvasElement extends FakeElement {}

class FakeDocument {
  public readonly body = new FakeElement('body');
  public readonly stage = new FakeElement('div');
  public readonly canvas = new FakeCanvasElement('canvas');
  private readonly elements: FakeElement[] = [this.body, this.stage, this.canvas];

  public constructor() {
    this.stage.attributes['class'] = 'stage_stage-wrapper';
    this.stage.append(this.canvas);
    this.body.append(this.stage);
  }

  public createElement(tagName: string): FakeElement {
    const element = new FakeElement(tagName);
    this.elements.push(element);
    return element;
  }

  public getElementById(id: string): FakeElement | null {
    return this.elements.find((element) => element.id === id) ?? null;
  }

  public querySelector(selector: string): FakeElement | null {
    if (selector === '[class*="stage_stage-wrapper"]') return this.stage;
    if (selector === 'canvas') return this.canvas;
    return null;
  }
}

beforeEach(() => {
  vi.stubGlobal('Scratch', {
    BlockType: {BOOLEAN: 'boolean', COMMAND: 'command', HAT: 'hat', REPORTER: 'reporter'},
    ArgumentType: {NUMBER: 'number', STRING: 'string'},
    Cast: {
      toString: (value: unknown) => String(value),
      toNumber: (value: unknown) => Number(value),
      toBoolean: (value: unknown) => Boolean(value)
    },
    translate: (
      message: string | {default: string},
      placeholders: Record<string, string | number> = {}
    ) => {
      const text = typeof message === 'string' ? message : message.default;
      return Object.entries(placeholders).reduce(
        (result, [name, value]) => result.replace(`{${name}}`, String(value)),
        text
      );
    }
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TurboWarpAFrameExtension', () => {
  it('publishes TurboWarp-A-Frame metadata and implemented blocks', () => {
    const info = new TurboWarpAFrameExtension().getInfo() as {
      id: string;
      name: string;
      docsURI: string;
      blockIconURI: string;
      blocks: Array<{opcode: string; blockType: string; text: string}>;
    };

    expect(info.id).toBe('turbowarpaframe');
    expect(info.name).toBe('TurboWarp-A-Frame');
    expect(info.docsURI).toBe('https://kubohiroya.github.io/turbowarp-aframe/');
    expect(info.blockIconURI).toMatch(/^data:image\/svg\+xml;base64,/);
    expect(info.blocks.map((block) => block.opcode)).toContain('createScene');
    expect(info.blocks.map((block) => block.opcode)).toContain('whenEventOnSelector');
  });

  it('creates a scene and fires scene ready once', () => {
    const extension = new TurboWarpAFrameExtension();

    extension.createScene({LAYER: 'camera-under-3d', MODE: 'ar-fallback'});

    expect(extension.whenSceneReady()).toBe(true);
    expect(extension.eventTargetId()).toBe('scene');
    expect(extension.whenSceneReady()).toBe(false);
    expect(extension.snapshot()).toMatchObject({
      options: {layer: 'camera-under-3d', mode: 'ar-fallback'}
    });
  });

  it('creates and mutates selected scene graph nodes', () => {
    const extension = new TurboWarpAFrameExtension();
    extension.createScene({LAYER: 'above-stage', MODE: '3d'});
    extension.createNode({TYPE: 'box', ID: 'card', PARENT: '#scene'});
    extension.addClass({CLASS: 'monster', SELECTOR: '#card'});
    extension.setData({SELECTOR: '#card', KEY: 'zone', VALUE: 'field'});
    extension.setPosition({SELECTOR: '[data-zone=field]', X: 1, Y: 2, Z: -3});
    extension.moveBy({SELECTOR: '.monster', X: 0, Y: 0.5, Z: 1});
    extension.setRotation({SELECTOR: '#card', X: 0, Y: 45, Z: 0});

    expect(extension.countSelector({SELECTOR: '.monster'})).toBe(1);
    const snapshot = extension.snapshot() as {
      nodes: Array<{
        id: string;
        type: string;
        parentId: string;
        classes: string[];
        data: Record<string, string>;
        attributes: Record<string, string>;
      }>;
    };
    expect(snapshot.nodes.find((node) => node.id === 'card')).toMatchObject({
      id: 'card',
      type: 'box',
      parentId: 'scene',
      classes: ['monster'],
      data: {zone: 'field'},
      attributes: {position: '1 2.5 -2', rotation: '0 45 0'}
    });
  });

  it('instantiates templates and deletes subtrees', () => {
    const extension = new TurboWarpAFrameExtension();
    extension.createScene({LAYER: 'above-stage', MODE: '3d'});
    extension.loadTemplate({
      ID: 'monster',
      SOURCE: JSON.stringify({
        type: 'group',
        class: 'monster',
        children: [{type: 'sphere', id: 'eye', class: 'part'}]
      })
    });

    extension.createFromTemplate({TEMPLATE: 'monster', INSTANCE: 'monster-1', PARENT: '#scene'});
    extension.createFromTemplate({TEMPLATE: 'monster', INSTANCE: 'monster-2', PARENT: '#scene'});

    expect(extension.countSelector({SELECTOR: '.monster'})).toBe(2);
    expect(extension.countSelector({SELECTOR: '.part'})).toBe(2);

    extension.deleteSelector({SELECTOR: '#monster-1'});

    expect(extension.countSelector({SELECTOR: '.monster'})).toBe(1);
    expect(extension.countSelector({SELECTOR: '.part'})).toBe(1);
  });

  it('queues selector-scoped events for hat blocks', () => {
    const extension = new TurboWarpAFrameExtension();
    extension.createScene({LAYER: 'above-stage', MODE: '3d'});
    extension.createNode({TYPE: 'box', ID: 'card', PARENT: '#scene'});
    extension.addClass({CLASS: 'monster', SELECTOR: '#card'});

    extension.emitEvent({TYPE: 'attack', SELECTOR: '#card', DATA: '{"damage":3}'});

    expect(extension.whenEventOnSelector({TYPE: 'attack', SELECTOR: '.monster'})).toBe(true);
    expect(extension.eventTargetId()).toBe('card');
    expect(extension.whenEventOnSelector({TYPE: 'attack', SELECTOR: '.monster'})).toBe(false);
  });

  it('mounts the scene host near the stage and converts DOM events into hat events', () => {
    const document = new FakeDocument();
    vi.stubGlobal('document', document);
    vi.stubGlobal('HTMLElement', FakeElement);
    vi.stubGlobal('HTMLCanvasElement', FakeCanvasElement);
    vi.stubGlobal('getComputedStyle', () => ({position: 'static'}));
    vi.stubGlobal(
      'CustomEvent',
      class {
        public readonly type: string;
        public readonly detail: unknown;

        public constructor(type: string, init: {detail?: unknown} = {}) {
          this.type = type;
          this.detail = init.detail;
        }
      }
    );

    const extension = new TurboWarpAFrameExtension();
    extension.createScene({LAYER: 'above-stage', MODE: '3d'});
    extension.whenEventOnSelector({TYPE: 'click', SELECTOR: '.monster'});
    extension.createNode({TYPE: 'box', ID: 'card', PARENT: '#scene'});
    extension.addClass({CLASS: 'monster', SELECTOR: '#card'});

    const host = document.getElementById('tw-aframe-root');
    const card = document.getElementById('card');
    card?.dispatchEvent({type: 'click', detail: {button: 0}});

    expect(host?.parentElement).toBe(document.stage);
    expect(document.stage.style.position).toBe('relative');
    expect(extension.whenEventOnSelector({TYPE: 'click', SELECTOR: '.monster'})).toBe(true);
    expect(extension.eventTargetId()).toBe('card');
  });

  it('rejects malformed templates before mutating the template registry', () => {
    const extension = new TurboWarpAFrameExtension();

    expect(() =>
      extension.loadTemplate({
        ID: 'bad',
        SOURCE: JSON.stringify({type: 'group', children: {type: 'box'}})
      })
    ).toThrow('A-Frame template.children must be an array.');
    expect(() =>
      extension.createFromTemplate({TEMPLATE: 'bad', INSTANCE: 'bad-1', PARENT: '#scene'})
    ).toThrow('Unknown A-Frame template: bad');
  });

  it('defines animation clips and validates keyframe track lengths before mutating registry', () => {
    const extension = new TurboWarpAFrameExtension();

    extension.createAnimationClip({NAME: 'wave', DURATION: 1});
    extension.addVectorKeyframeTrack({
      CLIP: 'wave',
      PATH: '.position',
      TIMES: '0, 0.5, 1',
      VALUES: '0,1,-3, 0,1.5,-3, 0,1,-3'
    });
    extension.addEulerRotationKeyframeTrack({
      CLIP: 'wave',
      PATH: '.quaternion',
      TIMES: '0, 1',
      VALUES: '0,0,0, 0,0,180',
      UNIT: 'degrees'
    });

    const snapshot = extension.snapshot() as {
      animationClips: Array<{
        name: string;
        duration: number;
        tracks: Array<{type: string; path: string; values: number[]}>;
      }>;
    };
    const clip = snapshot.animationClips.find((item) => item.name === 'wave');
    expect(clip).toMatchObject({
      name: 'wave',
      duration: 1,
      tracks: [
        {type: 'vector', path: '.position'},
        {type: 'quaternion', path: '.quaternion'}
      ]
    });
    expect(clip?.tracks[1]?.values).toHaveLength(8);
    expect(clip?.tracks[1]?.values[6]).toBeCloseTo(1);
    expect(clip?.tracks[1]?.values[7]).toBeCloseTo(0);

    expect(() =>
      extension.addQuaternionKeyframeTrack({
        CLIP: 'wave',
        PATH: '.quaternion',
        TIMES: '0,1',
        VALUES: '0,0,0,1'
      })
    ).toThrow('Animation track values length must be 8 for 2 keyframes.');
    expect((extension.snapshot() as typeof snapshot).animationClips[0]?.tracks).toHaveLength(2);
  });

  it('adds user-friendly keyframes one at a time and replaces duplicate keyframe times', () => {
    const extension = new TurboWarpAFrameExtension();

    extension.createAnimationClip({NAME: 'wave', DURATION: 1});
    extension.addPositionKeyframe({CLIP: 'wave', TIME: 1, X: 0, Y: 1, Z: -3});
    extension.addPositionKeyframe({CLIP: 'wave', TIME: 0, X: 0, Y: 0.5, Z: -3});
    extension.addPositionKeyframe({CLIP: 'wave', TIME: 1, X: 0, Y: 1.25, Z: -3});
    extension.addEulerRotationKeyframe({
      CLIP: 'wave',
      TIME: 0.5,
      X: 0,
      Y: 0,
      Z: Math.PI,
      UNIT: 'radians'
    });

    const snapshot = extension.snapshot() as {
      animationClips: Array<{
        tracks: Array<{type: string; path: string; times: number[]; values: number[]}>;
      }>;
    };
    const tracks = snapshot.animationClips[0]?.tracks ?? [];
    expect(tracks.find((track) => track.path === '.position')).toMatchObject({
      times: [0, 1],
      values: [0, 0.5, -3, 0, 1.25, -3]
    });
    const rotation = tracks.find((track) => track.path === '.quaternion');
    expect(rotation?.type).toBe('quaternion');
    expect(rotation?.values[2]).toBeCloseTo(1);
    expect(rotation?.values[3]).toBeCloseTo(0);
  });

  it('rejects playback for empty animation clips with a clear error', () => {
    const extension = new TurboWarpAFrameExtension();
    extension.createScene({LAYER: 'above-stage', MODE: '3d'});
    extension.createNode({TYPE: 'box', ID: 'leftArm', PARENT: '#scene'});
    extension.createAnimationClip({NAME: 'empty', DURATION: 1});

    expect(() =>
      extension.playAnimationClip({CLIP: 'empty', SELECTOR: '#leftArm', LOOP: true})
    ).toThrow('3D animation clip has no keyframe tracks: empty');
  });

  it('plays animation clips with a Three.js mixer when object3D is available', () => {
    const updates: number[] = [];
    interface FakeAction {
      paused?: boolean;
      stopped?: boolean;
      timeScale?: number;
      play(): FakeAction;
      stop(): FakeAction;
      setLoop(): FakeAction;
    }
    const actions: FakeAction[] = [];
    const components: Record<string, unknown> = {};
    vi.stubGlobal('AFRAME', {
      components,
      THREE: {
        AnimationClip: class {
          public constructor(
            public readonly name: string,
            public readonly duration: number,
            public readonly tracks: unknown[]
          ) {}
        },
        AnimationMixer: class {
          public constructor(public readonly root: unknown) {}
          public clipAction(): FakeAction {
            const action: FakeAction = {
              paused: false,
              timeScale: 1,
              play: () => action,
              stop: () => {
                action.stopped = true;
                return action;
              },
              setLoop: () => action
            };
            actions.push(action);
            return action;
          }
          public update(deltaTime: number): void {
            updates.push(deltaTime);
          }
        },
        LoopOnce: 'once',
        LoopRepeat: 'repeat',
        QuaternionKeyframeTrack: class {
          public constructor(
            public readonly name: string,
            public readonly times: number[],
            public readonly values: number[]
          ) {}
        },
        VectorKeyframeTrack: class {
          public constructor(
            public readonly name: string,
            public readonly times: number[],
            public readonly values: number[]
          ) {}
        }
      },
      registerComponent: (name: string, definition: unknown) => {
        components[name] = definition;
      }
    });
    const document = new FakeDocument();
    vi.stubGlobal('document', document);
    vi.stubGlobal('HTMLElement', FakeElement);
    vi.stubGlobal('HTMLCanvasElement', FakeCanvasElement);
    vi.stubGlobal('getComputedStyle', () => ({position: 'static'}));
    vi.stubGlobal(
      'CustomEvent',
      class {
        public readonly type: string;
        public readonly detail: unknown;

        public constructor(type: string, init: {detail?: unknown} = {}) {
          this.type = type;
          this.detail = init.detail;
        }
      }
    );

    const extension = new TurboWarpAFrameExtension();
    extension.createScene({LAYER: 'above-stage', MODE: '3d'});
    extension.createNode({TYPE: 'box', ID: 'leftArm', PARENT: '#scene'});
    extension.createAnimationClip({NAME: 'wave', DURATION: 1});
    extension.addQuaternionKeyframeTrack({
      CLIP: 'wave',
      PATH: '.quaternion',
      TIMES: '0,0.5,1',
      VALUES: '0,0,0,1, 0,0,0.389,0.921, 0,0,0,1'
    });

    extension.playAnimationClip({CLIP: 'wave', SELECTOR: '#leftArm', LOOP: true});

    expect(extension.isAnimationClipPlaying({CLIP: 'wave', SELECTOR: '#leftArm'})).toBe(true);
    extension.setAnimationTimeScale({CLIP: 'wave', SELECTOR: '#leftArm', SCALE: 2});
    extension.testStepAnimations({DELTA: 16});
    expect(updates).toEqual([0.032]);
    expect(actions[0]?.timeScale).toBe(2);

    extension.pauseAnimationClip({CLIP: 'wave', SELECTOR: '#leftArm'});
    expect(extension.isAnimationClipPlaying({CLIP: 'wave', SELECTOR: '#leftArm'})).toBe(false);
    expect(actions[0]?.paused).toBe(true);
    extension.resumeAnimationClip({CLIP: 'wave', SELECTOR: '#leftArm'});
    expect(extension.isAnimationClipPlaying({CLIP: 'wave', SELECTOR: '#leftArm'})).toBe(true);
    expect(actions[0]?.paused).toBe(false);

    extension.stopAnimationClip({CLIP: 'wave', SELECTOR: '#leftArm'});
    expect(actions[0]?.stopped).toBe(true);
  });
});
