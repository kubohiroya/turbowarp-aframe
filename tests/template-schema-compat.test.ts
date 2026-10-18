import {describe, expect, it} from 'vitest';
import {compileSchemaBundle, validateSchemaInput} from '@kubohiroya/turbowarp-extension-data-editor/schema';
import {decodeTemplateSource, templateSchemaBundle, validateTemplateInput, validateTemplateNode} from '../src/editor-schema.js';
const compiled = compileSchemaBundle(templateSchemaBundle);
if (compiled.kind !== 'compiled') throw Error('Template schema failed to compile.');
const context = {consumerId: 'defineTemplate', nowMs: 0, settings: null};
describe('existing A-Frame data compatibility', () => {
  it.each([{}, {type: '', id: ''}, {class: ['a', 'a'], classes: ['a', 'a']},
    {data: {n: {nested: [1, null]}}, attributes: {component: [1, true]}},
    {children: [{type: '', children: [{classes: ['', '']}]}]}])('accepts existing JSON %j unchanged', data => {
    const before = JSON.stringify(data);
    expect(() => validateTemplateNode(data, 'template')).not.toThrow();
    expect(validateSchemaInput(compiled.validator, data, {context, ownerValidate: validateTemplateInput}).kind).toBe('valid');
    expect(JSON.stringify(data)).toBe(before);
    const raw = '  '+before+'\n';expect(decodeTemplateSource(raw)).toEqual({source: raw, format: 'json', variantId: 'template-json', data});
  });
  it.each([null, [], 2, {unknown: true}, {type: 1}, {classes: 'a'}, {class: [1]}, {children: {}}, {children: [null]},
    {attributes: []}, {data: {' ': 1}}, {attributes: {'\t\u3000': {}}}])('rejects existing invalid JSON %j', data => {
    expect(() => validateTemplateNode(data, 'template')).toThrow();
    expect(validateSchemaInput(compiled.validator, data, {context, ownerValidate: validateTemplateInput}).kind).toBe('invalid');
  });
  it('keeps whitespace-only record key rejection in the owner layer', () => {
    const data = {attributes: {' ': 'kept'}};
    expect(compiled.validator.validate(data).kind).toBe('valid');
    const result = validateSchemaInput(compiled.validator, data, {context, ownerValidate: validateTemplateInput});
    expect(result.kind).toBe('invalid');expect(result.diagnostics[0]?.phase).toBe('semantic');
  });
});
