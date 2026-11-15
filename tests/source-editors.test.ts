import {createBlockEditorService} from '@kubohiroya/turbowarp-extension-data-editor/rjsf';
import {expect, it, vi} from 'vitest';
import {createSourceEditorOptions, registerSourceEditors} from '../src/source-editors.js';
import definitions from '../src/block-definitions.json';
const targets: Record<string, readonly string[]> = {"loadTemplate": ["SOURCE"]};
it('covers every planned opcode and input against the actual block definitions', () => {
  const options = createSourceEditorOptions();
  const actual = options.flatMap(option => option.opcodes.flatMap(opcode => option.bindings.map(binding => `${opcode.slice(option.extensionId.length + 1)}.${binding.argument}`))).sort();
  expect(actual).toEqual(Object.entries(targets).flatMap(([opcode, arguments_]) => arguments_.map(argument => `${opcode}.${argument}`)).sort());
  for (const [opcode, arguments_] of Object.entries(targets)) {
    const block = definitions.blocks.find(block => block.opcode === opcode);
    expect(block).toBeDefined();
    for (const argument of arguments_) expect(block!.arguments).toHaveProperty(argument);
  }
});
it('skips old hosts, registers only through the optional source API, and removes once', () => {
  expect(() => registerSourceEditors({} )()).not.toThrow();
  expect(() => registerSourceEditors({gui: {blockEditors: {apiVersion: 1}}})()).not.toThrow();
  const seen: unknown[] = [];
  let removals = 0;
  const remove = registerSourceEditors({gui: {blockEditors: {apiVersion: 1, registerSourceEditor: (options: unknown) => {seen.push(options); return () => {removals++;};}}}});
  expect(seen.length).toBe(createSourceEditorOptions().length);
  remove(); remove(); expect(removals).toBe(seen.length);
});
it('keeps decode failures safe and preserves the exact source at owner validation', () => {
  const source = '{private-input broken';
  for (const definition of createSourceEditorOptions()) for (const binding of definition.bindings) {
    expect(() => binding.decode(source)).toThrow();
    const result = binding.validateSource(source, definition.validationContext());
    expect(result.source).toBe(source); expect(result.result.kind).toBe('invalid');
    expect(JSON.stringify(result.result)).not.toContain('private-input');
    expect(binding.variants.length).toBeGreaterThan(0);
  }
});

it('retains legacy template values, duplicate classes and unknown properties in the editing view', () => {
 const source = ' {"type":"","id":"","class":["a","a"],"attributes":{"position":[0,1,2],"custom":{"x":true},"extra":null}} ';
 const option = createSourceEditorOptions()[0]!; const binding = option.bindings[0]!;
 const read = binding.decode(source); expect(read.source).toBe(source); expect(read.data).toEqual(JSON.parse(source));
 expect(binding.validateSource(source, option.validationContext()).result.kind).toBe('valid');
});

it('registers and resolves every fully qualified opcode through the actual common service', () => {
  const service = createBlockEditorService();
  const remove = registerSourceEditors({gui: {blockEditors: service.api}});
  const options = createSourceEditorOptions();
  for (const option of options) for (const opcode of option.opcodes) {
    expect(opcode.startsWith(`${option.extensionId}_`)).toBe(true);
    expect(service.registry.resolve(opcode)).toMatchObject({extensionId: option.extensionId, editorId: option.editorId,
      editableArguments: option.bindings.map(binding => binding.argument)});
  }
  remove(); remove();
  for (const option of options) for (const opcode of option.opcodes) expect(service.registry.resolve(opcode)).toBeUndefined();
});

class FakeRuntime {
  private readonly listeners = new Map<string, Set<() => void>>();
  public on(event: string, listener: () => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
  }
  public off(event: string, listener: () => void): void {this.listeners.get(event)?.delete(listener);}
  public emit(event: string): void {for (const listener of [...this.listeners.get(event) ?? []]) listener();}
  public count(event: string): number {return this.listeners.get(event)?.size ?? 0;}
}
function tracking() {
  const removes: Array<ReturnType<typeof vi.fn>> = [];
  const register = vi.fn<(options: unknown) => () => void>(() => {const remove = vi.fn();removes.push(remove);return remove;});
  return {register, removes, removedOnce: () => removes.every(remove => remove.mock.calls.length === 1)};
}

// Every project load disposes the runtime but keeps the extension loaded for the next project.
it('registers the same source editors again once the next project has loaded', () => {
  const runtime = new FakeRuntime();const {register, removedOnce} = tracking();
  const remove = registerSourceEditors({gui: {blockEditors: {apiVersion: 1, registerSourceEditor: register}}, vm: {runtime}});
  const n = createSourceEditorOptions().length;expect(register).toHaveBeenCalledTimes(n);
  runtime.emit('RUNTIME_DISPOSED');expect(removedOnce()).toBe(true);
  runtime.emit('PROJECT_LOADED');expect(register).toHaveBeenCalledTimes(2 * n);
  expect(register.mock.calls.slice(n).map(call => (call[0] as {editorId: string}).editorId))
    .toEqual(register.mock.calls.slice(0, n).map(call => (call[0] as {editorId: string}).editorId));
  runtime.emit('PROJECT_LOADED');expect(register).toHaveBeenCalledTimes(2 * n);
  remove();expect(removedOnce()).toBe(true);
  runtime.emit('RUNTIME_DISPOSED');runtime.emit('PROJECT_LOADED');
  expect(register).toHaveBeenCalledTimes(2 * n);
  expect(runtime.count('RUNTIME_DISPOSED') + runtime.count('PROJECT_LOADED')).toBe(0);
});
