import {parseFixedNumberInput} from '@kubohiroya/turbowarp-extension-data-editor';
import type {FixedInputBinding, FixedInputEditorOptions, JsonValue, LiteralValue} from '@kubohiroya/turbowarp-extension-data-editor';
import {fixedInputBundle} from './fixed-input-schema.js';

const existingNumber = (value: LiteralValue): number => {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      (typeof value === 'string' && value.trim() === '')) throw new TypeError('Expected a numeric literal.');
  const number = Number(value);
  if (!Number.isFinite(number)) throw new TypeError('Expected a finite number.');
  return number;
};
const newNumber = (value: JsonValue): string => {
  const parsed = parseFixedNumberInput(value);
  if (parsed.kind !== 'valid') throw new TypeError('Invalid new numeric input.');
  return parsed.token;
};

function binding(opcode: string, argument: string, values?: readonly string[]): FixedInputBinding {
  return {argument, schemaBundle: fixedInputBundle(opcode, argument),
    control: values ? {kind: 'enum', choices: values.map(value => ({value}))} : {kind: 'number'},
    read(value) {
      if (!values) return existingNumber(value);
      if (typeof value !== 'string') throw new TypeError('Expected a string.');
      return projectEnum(opcode, argument, value);
    },
    encode(value) {
      if (!values) return newNumber(value);
      if (typeof value !== 'string' || !values.includes(value)) throw new TypeError('Invalid selection.');
      return value;
    },
    validateCandidate(value) {
      try {
        if (!values) existingNumber(value);
        else if (typeof value !== 'string' || !values.includes(value)) throw new TypeError('Invalid selection.');
        return [];
      } catch {return [{message: 'Invalid fixed input.'}];}
    }};
}

function projectEnum(_opcode: string, argument: string, value: string): string {
  return argument === 'UNIT' ? value.trim().toLowerCase() : value.trim();
}

export const fixedInputEditors: readonly FixedInputEditorOptions[] = [
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-createScene', opcodes: ['turbowarpaframe_createScene'],
    contractId: 'turbowarp-aframe/createScene', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('createScene', 'LAYER', ["above-stage", "below-stage"])]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-setPosition', opcodes: ['turbowarpaframe_setPosition'],
    contractId: 'turbowarp-aframe/setPosition', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('setPosition', 'X'), binding('setPosition', 'Y'), binding('setPosition', 'Z')]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-moveBy', opcodes: ['turbowarpaframe_moveBy'],
    contractId: 'turbowarp-aframe/moveBy', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('moveBy', 'X'), binding('moveBy', 'Y'), binding('moveBy', 'Z')]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-setRotation', opcodes: ['turbowarpaframe_setRotation'],
    contractId: 'turbowarp-aframe/setRotation', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('setRotation', 'X'), binding('setRotation', 'Y'), binding('setRotation', 'Z')]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-createAnimationClip', opcodes: ['turbowarpaframe_createAnimationClip'],
    contractId: 'turbowarp-aframe/createAnimationClip', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('createAnimationClip', 'DURATION')]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-addVectorKeyframeTrack', opcodes: ['turbowarpaframe_addVectorKeyframeTrack'],
    contractId: 'turbowarp-aframe/addVectorKeyframeTrack', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('addVectorKeyframeTrack', 'PATH', [".position", ".scale"])]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-addQuaternionKeyframeTrack', opcodes: ['turbowarpaframe_addQuaternionKeyframeTrack'],
    contractId: 'turbowarp-aframe/addQuaternionKeyframeTrack', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('addQuaternionKeyframeTrack', 'PATH', [".quaternion"])]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-addEulerRotationKeyframeTrack', opcodes: ['turbowarpaframe_addEulerRotationKeyframeTrack'],
    contractId: 'turbowarp-aframe/addEulerRotationKeyframeTrack', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('addEulerRotationKeyframeTrack', 'PATH', [".quaternion"]), binding('addEulerRotationKeyframeTrack', 'UNIT', ["degrees", "radians"])]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-addPositionKeyframe', opcodes: ['turbowarpaframe_addPositionKeyframe'],
    contractId: 'turbowarp-aframe/addPositionKeyframe', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('addPositionKeyframe', 'TIME'), binding('addPositionKeyframe', 'X'), binding('addPositionKeyframe', 'Y'), binding('addPositionKeyframe', 'Z')]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-addScaleKeyframe', opcodes: ['turbowarpaframe_addScaleKeyframe'],
    contractId: 'turbowarp-aframe/addScaleKeyframe', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('addScaleKeyframe', 'TIME'), binding('addScaleKeyframe', 'X'), binding('addScaleKeyframe', 'Y'), binding('addScaleKeyframe', 'Z')]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-addEulerRotationKeyframe', opcodes: ['turbowarpaframe_addEulerRotationKeyframe'],
    contractId: 'turbowarp-aframe/addEulerRotationKeyframe', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('addEulerRotationKeyframe', 'TIME'), binding('addEulerRotationKeyframe', 'X'), binding('addEulerRotationKeyframe', 'Y'), binding('addEulerRotationKeyframe', 'Z'), binding('addEulerRotationKeyframe', 'UNIT', ["degrees", "radians"])]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-setAnimationTimeScale', opcodes: ['turbowarpaframe_setAnimationTimeScale'],
    contractId: 'turbowarp-aframe/setAnimationTimeScale', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('setAnimationTimeScale', 'SCALE')]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-setVrmBoneRotation', opcodes: ['turbowarpaframe_setVrmBoneRotation'],
    contractId: 'turbowarp-aframe/setVrmBoneRotation', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('setVrmBoneRotation', 'X'), binding('setVrmBoneRotation', 'Y'), binding('setVrmBoneRotation', 'Z')]},
  {apiVersion: 1, extensionId: 'turbowarpaframe', editorId: 'fixed-setVrmExpression', opcodes: ['turbowarpaframe_setVrmExpression'],
    contractId: 'turbowarp-aframe/setVrmExpression', contractRevision: '1',
    validationContext: () => ({consumerId: 'turbowarp-aframe', nowMs: 0, settings: null}),
    bindings: [binding('setVrmExpression', 'WEIGHT')]},
];

interface OptionalHost {
  gui?: {blockEditors?: {apiVersion?: number; registerFixedInputEditor?: (options: FixedInputEditorOptions) => () => void}};
  vm?: {runtime?: {on?: (event: string, listener: () => void) => void; off?: (event: string, listener: () => void) => void}};
}

/** Register only currently declared opcodes; release obsolete feature-flag scopes. */
export function fixedInputRegistration(scratch: unknown) {
  const host = (typeof scratch === 'object' && scratch !== null ? scratch : {}) as OptionalHost;
  let active: unknown;
  let activeOpcodes = '';
  const removers: (() => void)[] = [];
  let disposed = false;
  const dispose = () => {
    host.vm?.runtime?.off?.('RUNTIME_DISPOSED', shutdown);
    for (const remove of removers.splice(0).reverse()) remove();
    active = undefined; activeOpcodes = '';
  };
  const shutdown = () => {disposed = true; dispose();};
  return {
    ensure(opcodes: readonly string[]) {
      const api = host.gui?.blockEditors;
      const signature = [...new Set(opcodes)].sort().join('\0');
      if (disposed || (api === active && signature === activeOpcodes)) return;
      dispose();
      if (api?.apiVersion !== 1 || typeof api.registerFixedInputEditor !== 'function') return;
      try {
        for (const definition of fixedInputEditors) {
          if (definition.opcodes.every(opcode => opcodes.includes(opcode))) {
            const remove = api.registerFixedInputEditor.call(api, definition);
            if (typeof remove !== 'function') throw new TypeError('Invalid fixed registration cleanup.');
            removers.push(remove);
          }
        }
        active = api; activeOpcodes = signature;
        host.vm?.runtime?.on?.('RUNTIME_DISPOSED', shutdown);
      } catch (error) {dispose(); throw error;}
    },
    dispose: shutdown
  };
}
