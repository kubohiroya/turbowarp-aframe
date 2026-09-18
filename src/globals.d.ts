interface TurboWarpExtension {
  getInfo(): Record<string, unknown>;
}

interface ScratchTranslate {
  (text: string): string;
  (message: {default: string; description?: string}, placeholders?: Record<string, string | number>): string;
}

interface ScratchApi {
  extensions: {
    unsandboxed: boolean;
    register(extension: TurboWarpExtension): void;
  };
  BlockType: Record<'COMMAND' | 'REPORTER' | 'BOOLEAN' | 'HAT', string>;
  ArgumentType: Record<'STRING' | 'NUMBER' | 'BOOLEAN', string>;
  Cast: {
    toString(value: unknown): string;
    toNumber(value: unknown): number;
    toBoolean(value: unknown): boolean;
  };
  translate: ScratchTranslate;
  vm?: {
    runtime?: Record<string, unknown>;
  };
}

declare const Scratch: ScratchApi;

declare module 'virtual:three-vrm-factory' {
  export function createThreeVrm(THREE: unknown): {
    VRMLoaderPlugin: new (parser: never) => unknown;
    VRMUtils: {
      deepDispose(object: never): void;
      rotateVRM0(vrm: never): void;
    };
  };
}
