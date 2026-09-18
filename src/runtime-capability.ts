/**
 * The version of the object published at `runtime.turbowarpAFrameCapability`. It stays 1 so
 * consumers that check `version === 1` keep working; later versions are reached through
 * `requireVersion`.
 */
export const runtimeCapabilityVersion = 1 as const;
export const supportedRuntimeCapabilityVersions = Object.freeze([1, 2] as const);
export const runtimeCapabilityKey = 'turbowarpAFrameCapability';

export type SupportedRuntimeCapabilityVersion = (typeof supportedRuntimeCapabilityVersions)[number];

export interface AFrameScenePort {
  loadTemplate(id: string, source: string): void;
  createFromTemplate(template: string, instance: string, parent: string): void;
  setPosition(selector: string, x: number, y: number, z: number): void;
  setRotation(selector: string, x: number, y: number, z: number): void;
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
}

interface VersionNegotiation {
  readonly supportedVersions: readonly SupportedRuntimeCapabilityVersion[];
  requireVersion(version: 1): AFrameRuntimeCapabilityV1;
  requireVersion(version: 2): AFrameRuntimeCapabilityV2;
  requireVersion(version: number): AFrameRuntimeCapabilityV1 | AFrameRuntimeCapabilityV2;
}

export interface AFrameRuntimeCapabilityV1 extends AFrameScenePort, VersionNegotiation {
  readonly version: 1;
}

export interface AFrameRuntimeCapabilityV2 extends AFrameScenePort, AFrameVrmPort, VersionNegotiation {
  readonly version: 2;
}

export function createRuntimeCapability(
  scene: AFrameScenePort & AFrameVrmPort,
  assertActive: () => void
): AFrameRuntimeCapabilityV1 {
  function requireVersion(version: 1): AFrameRuntimeCapabilityV1;
  function requireVersion(version: 2): AFrameRuntimeCapabilityV2;
  function requireVersion(version: number): AFrameRuntimeCapabilityV1 | AFrameRuntimeCapabilityV2;
  function requireVersion(version: number): AFrameRuntimeCapabilityV1 | AFrameRuntimeCapabilityV2 {
    assertActive();
    if (version === 1) return v1;
    if (version === 2) return v2;
    throw new Error(
      `Unsupported A-Frame runtime capability version: ${version}; supported versions are ${supportedRuntimeCapabilityVersions.join(', ')}.`
    );
  }

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
    }
  };

  const negotiation = {supportedVersions: supportedRuntimeCapabilityVersions, requireVersion};
  const v1: AFrameRuntimeCapabilityV1 = Object.freeze({
    version: 1 as const,
    ...negotiation,
    ...scenePort
  });
  const v2: AFrameRuntimeCapabilityV2 = Object.freeze({
    version: 2 as const,
    ...negotiation,
    ...scenePort,
    ...vrmPort
  });
  return v1;
}
