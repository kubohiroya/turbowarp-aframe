import document from '../schemas/block-editor-template-compat.schema.json' with {type: 'json'};
import type {SchemaBundle, SchemaDocument, SyncOwnerValidator} from '@kubohiroya/turbowarp-extension-data-editor/schema';
import {validateTemplateNode} from './template-validation.js';
export {validateTemplateNode} from './template-validation.js';
const source = {repository: 'turbowarp-aframe', path: 'schemas/block-editor-template-compat.schema.json'};
/** Parser-compatible gate; the older strict public schema is reference material only. */
export const templateSchemaBundle: SchemaBundle = {
  identity: {ownerId: 'turbowarp-aframe', contractId: 'aframe-template', revision: 'parser-v0.7.0', variantId: 'template-json'},
  dialect: '2020-12', root: {retrievalUri: document.$id, document: document as SchemaDocument, artifact: {role: 'canonical-schema', source}}, resources: [],
  provenance: {canonicalSources: [source, {repository: 'turbowarp-aframe', path: 'src/template-validation.ts', symbol: 'validateTemplateNode'}], generatedFiles: [], referenceSchemas: [{repository: 'turbowarp-aframe', path: 'schemas/aframe-template.schema.json'}],
    generationSources: []}
};
export const validateTemplateInput: SyncOwnerValidator = data => {
  try {validateTemplateNode(data, 'template');return {kind: 'valid', issues: []};}
  catch {return {kind: 'invalid', issues: [{dataPath: '', ruleId: 'existing-template-parser'}]};}
};
export function decodeTemplateSource(source: string) {
  return {source, format: 'json' as const, variantId: 'template-json' as const, data: JSON.parse(source) as unknown};
}
