import type {SourceBinding, SourceEditorOptions, SourceValidation} from '@kubohiroya/turbowarp-extension-data-editor/schema';
import {extensionConfig} from './config.js';

function checkedSource(value: {source: string; result: {kind: 'valid' | 'invalid' | 'execution-error' | 'schema-error'; diagnostics: readonly {code: string; dataPath?: string}[]}}): SourceValidation {
  return value.result.kind === 'valid'
    ? {source: value.source, result: {kind: 'valid', diagnostics: []}}
    : {source: value.source, result: {kind: value.result.kind, diagnostics: value.result.diagnostics}};
}
import {templateSchemaBundle, decodeTemplateSource, validateTemplateSource} from './editor-schema.js';
export function createSourceEditorOptions(nowMs: () => number = Date.now): readonly SourceEditorOptions[] {
  const context = () => ({consumerId: extensionConfig.id, nowMs: nowMs(), settings: null});
  return [
    {apiVersion: 1, extensionId: extensionConfig.id, editorId: 'template-source', opcodes: ["loadTemplate"].map(opcode => `${extensionConfig.id}_${opcode}`), bindings: [{argument: 'SOURCE', variants: [{variantId: 'template-json', format: 'json', schemaBundle: templateSchemaBundle}], decode: source => {const decoded = decodeTemplateSource(source); return {...decoded, data: decoded.data as ReturnType<SourceBinding['decode']>['data']};}, validateSource: (source, context) => checkedSource(validateTemplateSource(source, context))}], validationContext: context}
  ];
}

interface OptionalSourceHost {
  gui?: {blockEditors?: {apiVersion?: number; registerSourceEditor?: (options: SourceEditorOptions) => () => void}};
  vm?: {runtime?: {on?: (event: string, listener: () => void) => void; off?: (event: string, listener: () => void) => void}};
}

/**
 * Optional capability: old GUIs continue executing blocks without editor registration.
 *
 * Every project load disposes the runtime, which releases the registrations, but the extension
 * stays loaded for the next project: the same editors are registered again once that project has
 * loaded. Only the returned remover is final.
 */
export function registerSourceEditors(scratch: unknown, nowMs: () => number = Date.now): () => void {
  const host = (typeof scratch === 'object' && scratch !== null ? scratch : {}) as OptionalSourceHost;
  const api = host.gui?.blockEditors;
  if (api?.apiVersion !== 1 || typeof api.registerSourceEditor !== 'function') return () => {};
  const removers: (() => void)[] = [];
  const release = () => {for (const remove of removers.splice(0).reverse()) remove();};
  const register = (): boolean => {
    try {
      for (const options of createSourceEditorOptions(nowMs)) removers.push(api.registerSourceEditor!(options));
      return true;
    } catch {
      release();
      return false;
    }
  };
  if (!register()) return () => {};
  let released = false;
  const runtimeDisposed = () => {release(); released = true;};
  const projectLoaded = () => {
    if (!released) return;
    released = false;
    register();
  };
  const runtime = host.vm?.runtime;
  runtime?.on?.('RUNTIME_DISPOSED', runtimeDisposed);
  runtime?.on?.('PROJECT_LOADED', projectLoaded);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    runtime?.off?.('RUNTIME_DISPOSED', runtimeDisposed);
    runtime?.off?.('PROJECT_LOADED', projectLoaded);
    release();
  };
}
