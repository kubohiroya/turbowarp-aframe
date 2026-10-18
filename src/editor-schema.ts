import {
  compileSchemaBundle,
  validateSchemaInput,
} from '@kubohiroya/turbowarp-extension-data-editor/schema';
import type {
  SchemaValidationContext,
  SchemaJsonValue,
  InputDiagnostic,
} from '@kubohiroya/turbowarp-extension-data-editor/schema';
import document from '../schemas/block-editor-template-compat.schema.json' with { type: 'json' };
import type {
  SchemaBundle,
  SchemaDocument,
  SyncOwnerValidator,
} from '@kubohiroya/turbowarp-extension-data-editor/schema';
import { validateTemplateNode } from './template-validation.js';
export { validateTemplateNode } from './template-validation.js';
const source = {
  repository: 'turbowarp-aframe',
  path: 'schemas/block-editor-template-compat.schema.json',
};
/** Parser-compatible gate; the older strict public schema is reference material only. */
export const templateSchemaBundle: SchemaBundle = {
  identity: {
    ownerId: 'turbowarp-aframe',
    contractId: 'aframe-template',
    revision: 'parser-v0.7.0',
    variantId: 'template-json',
  },
  dialect: '2020-12',
  root: {
    retrievalUri: document.$id,
    document: document as SchemaDocument,
    artifact: { role: 'canonical-schema', source },
  },
  resources: [],
  provenance: {
    canonicalSources: [
      source,
      {
        repository: 'turbowarp-aframe',
        path: 'src/template-validation.ts',
        symbol: 'validateTemplateNode',
      },
    ],
    generatedFiles: [],
    referenceSchemas: [
      { repository: 'turbowarp-aframe', path: 'schemas/aframe-template.schema.json' },
    ],
    generationSources: [],
  },
};
export const validateTemplateInput: SyncOwnerValidator = (data) => {
  try {
    validateTemplateNode(data, 'template');
    return { kind: 'valid', issues: [] };
  } catch {
    return { kind: 'invalid', issues: [{ dataPath: '', ruleId: 'existing-template-parser' }] };
  }
};
export function decodeTemplateSource(source: string) {
  return {
    source,
    format: 'json' as const,
    variantId: 'template-json' as const,
    data: JSON.parse(source) as unknown,
  };
}

const sourceCompilation = compileSchemaBundle(templateSchemaBundle);
/** Safe source boundary: preserve raw input separately from diagnostics and normalized values. */
export function validateTemplateSource(source: string, context: SchemaValidationContext) {
  let consumerId: string | undefined;
  try {
    const descriptor = Object.getOwnPropertyDescriptor(context, 'consumerId');
    if (descriptor && 'value' in descriptor && typeof descriptor.value === 'string')
      consumerId = descriptor.value;
  } catch {
    /* Leave the consumer unspecified when context cannot be inspected safely. */
  }
  let decoded: ReturnType<typeof decodeTemplateSource>;
  try {
    decoded = decodeTemplateSource(source);
  } catch (error) {
    const code =
      error instanceof TypeError && error.message === 'Unrecognized camera profile variant.'
        ? ('variant-unrecognized' as const)
        : ('input-format-invalid' as const);
    const diagnostics: readonly [InputDiagnostic & { phase: 'decode' }] = [
      {
        scope: {
          identity: templateSchemaBundle.identity,
          ...(consumerId === undefined ? {} : { consumerId }),
        },
        phase: 'decode',
        code,
        dataPath: '',
      },
    ];
    return { source, result: { kind: 'invalid' as const, diagnostics } };
  }
  const compilation = sourceCompilation;
  if (compilation.kind !== 'compiled') return { ...decoded, result: compilation };
  return {
    ...decoded,
    result: validateSchemaInput(compilation.validator, decoded.data as SchemaJsonValue, {
      context,
      ownerValidate: validateTemplateInput,
    }),
  };
}
