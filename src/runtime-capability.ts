/** The only capability version this build provides; any other requested version is refused. */
export const runtimeCapabilityVersion = 2 as const;
export const runtimeCapabilityKey = 'turbowarpAFrameCapability';

export interface AFrameScenePort {
  loadTemplate(id: string, source: string): void;
  createFromTemplate(template: string, instance: string, parent: string): void;
  setPosition(selector: string, x: number, y: number, z: number): void;
  setRotation(selector: string, x: number, y: number, z: number): void;
  /** Sets an A-Frame component attribute, such as `visible`, on every matching node. */
  setAttribute(selector: string, name: string, value: string): void;
  /** Sets a `data-<key>` attribute on every matching node. */
  setData(selector: string, key: string, value: string): void;
  emitEvent(type: string, selector: string, data: string): void;
  deleteSelector(selector: string): void;
  countSelector(selector: string): number;
}

export type AFrameVrmState = 'none' | 'loading' | 'ready' | 'error';

export interface AFrameVrmStatus {
  state: AFrameVrmState;
  error: string;
}

export interface AFrameVrmPort {
  /** Loads a VRM onto the first node matching the selector; resolves when it is ready. */
  loadVrm(url: string, selector: string): Promise<void>;
  /** Euler degrees on a normalized humanoid bone, relative to the T-pose. */
  setVrmBoneRotation(selector: string, bone: string, x: number, y: number, z: number): void;
  vrmBoneNames(selector: string): string[];
  vrmStatus(selector: string): AFrameVrmStatus;
  /** Weight from 0 through 1, clamped, of a preset or custom VRM expression. */
  setVrmExpression(selector: string, name: string, weight: number): void;
  vrmExpressionNames(selector: string): string[];
}

export interface AFrameRuntimeCapabilityV2 extends AFrameScenePort, AFrameVrmPort {
  readonly version: typeof runtimeCapabilityVersion;
  requireVersion(version: number): AFrameRuntimeCapabilityV2;
}

export function createRuntimeCapability(
  scene: AFrameScenePort & AFrameVrmPort,
  assertActive: () => void
): AFrameRuntimeCapabilityV2 {
  const scenePort: AFrameScenePort = {
    loadTemplate(id, source) {
      assertActive();
      scene.loadTemplate(id, source);
    },
    createFromTemplate(template, instance, parent) {
      assertActive();
      scene.createFromTemplate(template, instance, parent);
    },
    setPosition(selector, x, y, z) {
      assertActive();
      scene.setPosition(selector, x, y, z);
    },
    setRotation(selector, x, y, z) {
      assertActive();
      scene.setRotation(selector, x, y, z);
    },
    setAttribute(selector, name, value) {
      assertActive();
      scene.setAttribute(selector, name, value);
    },
    setData(selector, key, value) {
      assertActive();
      scene.setData(selector, key, value);
    },
    emitEvent(type, selector, data) {
      assertActive();
      scene.emitEvent(type, selector, data);
    },
    deleteSelector(selector) {
      assertActive();
      scene.deleteSelector(selector);
    },
    countSelector(selector) {
      assertActive();
      return scene.countSelector(selector);
    }
  };

  const vrmPort: AFrameVrmPort = {
    async loadVrm(url, selector) {
      assertActive();
      await scene.loadVrm(url, selector);
    },
    setVrmBoneRotation(selector, bone, x, y, z) {
      assertActive();
      scene.setVrmBoneRotation(selector, bone, x, y, z);
    },
    vrmBoneNames(selector) {
      assertActive();
      return scene.vrmBoneNames(selector);
    },
    vrmStatus(selector) {
      assertActive();
      return scene.vrmStatus(selector);
    },
    setVrmExpression(selector, name, weight) {
      assertActive();
      scene.setVrmExpression(selector, name, weight);
    },
    vrmExpressionNames(selector) {
      assertActive();
      return scene.vrmExpressionNames(selector);
    }
  };

  const capability: AFrameRuntimeCapabilityV2 = Object.freeze({
    version: runtimeCapabilityVersion,
    requireVersion(version: number) {
      assertActive();
      if (version !== runtimeCapabilityVersion) {
        throw new Error(
          `Unsupported A-Frame runtime capability version: ${version}; supported version is ${runtimeCapabilityVersion}.`
        );
      }
      return capability;
    },
    ...scenePort,
    ...vrmPort
  });
  return capability;
}
