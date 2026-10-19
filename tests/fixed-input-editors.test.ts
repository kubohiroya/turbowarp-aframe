import {TurboWarpAFrameExtension} from '../src/extension.js';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {createFixedInputEditor, type FixedBlockSnapshot, type FixedInputEditorOptions, type JsonObject, type LiteralValue} from '@kubohiroya/turbowarp-extension-data-editor';
import {fixedInputEditors, fixedInputRegistration} from '../src/fixed-input-editors.js';
import canonicalSchema from '../schemas/block-editor-fixed-inputs.schema.json' with {type: 'json'};

const literal = (value: LiteralValue) => ({kind: 'literal' as const, value});
function snapshot(options: FixedInputEditorOptions, args?: FixedBlockSnapshot['arguments']): FixedBlockSnapshot {
  const arguments_ = args ?? Object.fromEntries(options.bindings.map(binding => [binding.argument, literal(String(binding.control?.choices?.[0]?.value ?? '1'))]));
  return {targetId: 'target', blockId: 'block', opcode: options.opcodes[0]!, revision: '1', arguments: arguments_,
    fixedContext: {contractId: options.contractId, contractRevision: options.contractRevision, generation: '1',
      readOnlyArguments: [], dependencies: [], inputs: Object.fromEntries(options.bindings.map(binding => [binding.argument,
        {role: 'editable', source: arguments_[binding.argument]?.kind === 'reporter' ? 'reporter' : 'shadow', identity: binding.argument,
          ...(arguments_[binding.argument]?.kind === 'reporter' ? {} : {field: {blockId: binding.argument, name: 'NUM', type: 'math_number'}})}]))}};
}
const changeEditors = new WeakMap<FixedInputEditorOptions, ReturnType<typeof createFixedInputEditor>>();
function change(options: FixedInputEditorOptions, argument: string, value: LiteralValue, raw?: LiteralValue) {
  const current = snapshot(options);
  if (raw !== undefined) (current.arguments as Record<string, ReturnType<typeof literal>>)[argument] = literal(raw);
  let editor = changeEditors.get(options);
  if (!editor) {editor = createFixedInputEditor(options);changeEditors.set(options, editor);}
  const draft = editor.readFixed(current) as JsonObject;
  const edited = structuredClone(draft) as {inputs: Record<string, {value: LiteralValue; changed: boolean}>};
  edited.inputs[argument] = {value, changed: true};
  return editor.prepareFixedSave(edited, current);
}
function option(opcode: string) {return fixedInputEditors.find(o => o.opcodes[0]!.endsWith(`_${opcode}`))!;}

describe('fixed owner contracts', () => {
  it('covers exactly 33 writable arguments and resolves every canonical source pointer', () => {
    let count = 0;
    for (const definition of fixedInputEditors) for (const binding of definition.bindings) {
      let selected: unknown = canonicalSchema;
      for (const part of binding.schemaBundle.root.artifact.source.symbol!.slice(2).split('/')) selected = (selected as Record<string, unknown>)[part];
      expect(selected).toEqual(binding.schemaBundle.root.document);count++;
    }
    expect(count).toBe(33);
  });
  it('saves every fixed enum choice without touching any unbound argument', () => {
    for (const definition of fixedInputEditors) for (const binding of definition.bindings) {
      for (const choice of binding.control?.choices ?? []) {
        const result = change(definition, binding.argument, String(choice.value), '__unknown-old__');
        expect(result).toMatchObject({kind: 'ready', changes: [{argument: binding.argument, value: choice.value}]});
        expect(change(definition, binding.argument, '__new-unknown__').kind).toBe('invalid');
      }
    }
  });
  it('applies NP grammar to every new number, including programmatic changes without a buffer', () => {
    for (const definition of fixedInputEditors) for (const binding of definition.bindings.filter(b => b.control?.kind === 'number')) {
      for (const value of ['1e2', '0.5', '9007199254740993']) expect(change(definition, binding.argument, value)).toMatchObject({kind: 'ready', changes: [{argument: binding.argument, value}]});
      for (const value of ['0x10', '+1', '001', '1.', '', ' ', 'NaN', 'Infinity', '1e']) expect(change(definition, binding.argument, value).kind).toBe('invalid');
    }
  });
  it('preserves legacy raw, unknown selections, blanks and reporter connections on no-op', () => {
    for (const definition of fixedInputEditors) {
      // Reuse each contract editor while retaining every raw and reporter assertion.
      const editor = createFixedInputEditor(definition);
      for (const binding of definition.bindings) {
        for (const value of ['0x10', ' ', 'Infinity', '__unknown-old__', false] as const) {
          const current = snapshot(definition, {...snapshot(definition).arguments, [binding.argument]: literal(value)});
          expect(editor.prepareFixedSave(editor.readFixed(current), current)).toMatchObject({kind: 'ready', changes: []});
        }
        const current = snapshot(definition, {...snapshot(definition).arguments, [binding.argument]: {kind: 'reporter'}});
        const draft = editor.readFixed(current);
        expect(editor.describeFixed!(draft, current).inputs[binding.argument]!.state).toBe('readonly');
        expect(editor.prepareFixedSave(draft, current)).toMatchObject({kind: 'ready', changes: []});
      }
    }
  });
  it('registers only real opcodes, rebinds changed scopes and APIs, rolls back partial failure and disposes once', () => {
    const remove = vi.fn();const register = vi.fn(() => remove);const on = vi.fn();const off = vi.fn();
    const api = {apiVersion: 1, registerFixedInputEditor: register};const host = {gui: {blockEditors: api}, vm: {runtime: {on, off}}};
    const registration = fixedInputRegistration(host);const opcodes = fixedInputEditors.flatMap(o => o.opcodes);
    registration.ensure(opcodes);registration.ensure(opcodes);expect(register).toHaveBeenCalledTimes(fixedInputEditors.length);
    registration.ensure(opcodes.slice(0, 1));expect(remove).toHaveBeenCalledTimes(fixedInputEditors.length);
    expect(register).toHaveBeenCalledTimes(fixedInputEditors.length + 1);
    host.gui.blockEditors = {apiVersion: 1, registerFixedInputEditor: vi.fn(() => remove)};registration.ensure(opcodes);
    registration.dispose();registration.dispose();expect(on).toHaveBeenCalledWith('RUNTIME_DISPOSED', expect.any(Function));
    const failedRemove = vi.fn();let count = 0;
    const failed = fixedInputRegistration({gui: {blockEditors: {apiVersion: 1, registerFixedInputEditor() {if (++count === 2) throw new Error('failed');return failedRemove;}}}});
    expect(() => failed.ensure(opcodes)).toThrow('failed');expect(failedRemove).toHaveBeenCalledTimes(1);
    expect(() => fixedInputRegistration({}).ensure(opcodes)).not.toThrow();
    for (const host of [undefined, null, false]) {const absent = fixedInputRegistration(host);expect(() => absent.ensure(opcodes)).not.toThrow();expect(() => absent.dispose()).not.toThrow();}
  });
});


afterEach(() => vi.unstubAllGlobals());
describe('A-Frame existing runtime boundaries', () => {
  it('retains fractional duration sentinel range, non-negative keyframe time and unbounded stored WEIGHT', () => {
    for (const value of ['-1', '-0.5', '-0', '0', '1.5']) expect(change(option('createAnimationClip'), 'DURATION', value).kind).toBe('ready');
    expect(change(option('createAnimationClip'), 'DURATION', '-1.01').kind).toBe('invalid');
    for (const opcode of ['addPositionKeyframe', 'addScaleKeyframe', 'addEulerRotationKeyframe']) {
      expect(change(option(opcode), 'TIME', '-0.5').kind).toBe('invalid');
      expect(change(option(opcode), 'TIME', '0.5').kind).toBe('ready');
    }
    for (const value of ['-2', '3']) expect(change(option('setVrmExpression'), 'WEIGHT', value)).toMatchObject({kind: 'ready', changes: [{argument: 'WEIGHT', value}]});
    expect(fixedInputEditors.some(o => o.bindings.some(b => b.argument === 'LOOP'))).toBe(false);
  });
  it('matches the actual clip runtime for duration -0.5 and preserves original declaration output', () => {
    vi.stubGlobal('Scratch', {vm: {runtime: {}}, BlockType: {COMMAND: 'command', REPORTER: 'reporter', BOOLEAN: 'boolean', HAT: 'hat'},
      ArgumentType: {STRING: 'string', NUMBER: 'number', BOOLEAN: 'boolean'}, Cast: {toString: String, toNumber: Number, toBoolean: Boolean},
      translate: (value: string) => value});
    const extension = new TurboWarpAFrameExtension();
    expect(() => extension.createAnimationClip({NAME: 'test', DURATION: '-0.5'})).not.toThrow();
    expect(() => extension.createAnimationClip({NAME: 'test', DURATION: '-1.01'})).toThrow();
    const legacy = extension.getInfo();const register = vi.fn(() => vi.fn());
    Object.assign(Scratch, {gui: {blockEditors: {apiVersion: 1, registerFixedInputEditor: register}}});
    expect(extension.getInfo()).toEqual(legacy);extension.getInfo();expect(register).toHaveBeenCalledTimes(14);
    extension.dispose();
  });
});
