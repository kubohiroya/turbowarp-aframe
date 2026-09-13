export const runtimeCapabilityVersion = 1 as const;
export const runtimeCapabilityKey = 'turbowarpAFrameCapability';

export interface AFrameScenePort {
  loadTemplate(id: string, source: string): void;
  createFromTemplate(template: string, instance: string, parent: string): void;
  setPosition(selector: string, x: number, y: number, z: number): void;
  setRotation(selector: string, x: number, y: number, z: number): void;
  emitEvent(type: string, selector: string, data: string): void;
  deleteSelector(selector: string): void;
  countSelector(selector: string): number;
}

export interface AFrameRuntimeCapabilityV1 extends AFrameScenePort {
  readonly version: typeof runtimeCapabilityVersion;
  requireVersion(version: number): AFrameRuntimeCapabilityV1;
}

export function createRuntimeCapability(
  scene: AFrameScenePort,
  assertActive: () => void
): AFrameRuntimeCapabilityV1 {
  const capability: AFrameRuntimeCapabilityV1 = {
    version: runtimeCapabilityVersion,
    requireVersion(version) {
      assertActive();
      if (version !== runtimeCapabilityVersion) {
        throw new Error(
          `Unsupported A-Frame runtime capability version: ${version}; supported version is ${runtimeCapabilityVersion}.`
        );
      }
      return capability;
    },
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
  return Object.freeze(capability);
}
