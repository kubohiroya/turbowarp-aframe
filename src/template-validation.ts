export interface TemplateNode {
  type?: string;
  id?: string;
  class?: string | string[];
  classes?: string[];
  data?: Record<string, unknown>;
  attributes?: Record<string, unknown>;
  children?: TemplateNode[];
}


const TEMPLATE_NODE_KEYS = new Set([
  'attributes',
  'children',
  'class',
  'classes',
  'data',
  'id',
  'type'
]);

export function validateTemplateNode(value: unknown, path: string): asserts value is TemplateNode {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`A-Frame ${path} must be an object.`);
  }
  const node = value as Record<string, unknown>;
  for (const key of Object.keys(node)) {
    if (!TEMPLATE_NODE_KEYS.has(key)) {
      throw new TypeError(`A-Frame ${path}.${key} is not supported.`);
    }
  }
  validateOptionalString(node['type'], `${path}.type`);
  validateOptionalString(node['id'], `${path}.id`);
  validateTemplateClass(node['class'], `${path}.class`);
  validateOptionalStringArray(node['classes'], `${path}.classes`);
  validateStringRecord(node['data'], `${path}.data`);
  validateStringRecord(node['attributes'], `${path}.attributes`);
  const children = node['children'];
  if (children === undefined) return;
  if (!Array.isArray(children)) {
    throw new TypeError(`A-Frame ${path}.children must be an array.`);
  }
  children.forEach((child, index) => {
    validateTemplateNode(child, `${path}.children[${index}]`);
  });
}

function validateTemplateClass(value: unknown, path: string): void {
  if (value === undefined || typeof value === 'string') return;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return;
  throw new TypeError(`A-Frame ${path} must be a string or string array.`);
}

function validateOptionalStringArray(value: unknown, path: string): void {
  if (value === undefined) return;
  if (Array.isArray(value) && value.every((item) => typeof item === 'string')) return;
  throw new TypeError(`A-Frame ${path} must be a string array.`);
}

function validateOptionalString(value: unknown, path: string): void {
  if (value === undefined || typeof value === 'string') return;
  throw new TypeError(`A-Frame ${path} must be a string.`);
}

function validateStringRecord(value: unknown, path: string): void {
  if (value === undefined) return;
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`A-Frame ${path} must be an object.`);
  }
  for (const [key, recordValue] of Object.entries(value)) {
    if (key.trim().length === 0) {
      throw new TypeError(`A-Frame ${path} keys must be non-empty strings.`);
    }
    if (recordValue === undefined) {
      throw new TypeError(`A-Frame ${path}.${key} must not be undefined.`);
    }
  }
}

