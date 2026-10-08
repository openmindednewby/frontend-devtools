import schemaJson from './testdoc-results.v1.schema.json';

interface SchemaNode {
  $ref?: string;
  type?: string;
  required?: string[];
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  enum?: unknown[];
  pattern?: string;
  minLength?: number;
  minimum?: number;
}

const ROOT = schemaJson as SchemaNode & { $defs: Record<string, SchemaNode> };
const REF_PREFIX = '#/$defs/';

function typeOf(value: unknown): string {
  if (Array.isArray(value)) {
    return 'array';
  }
  if (Number.isInteger(value)) {
    return 'integer';
  }
  return value === null ? 'null' : typeof value;
}

function typeMatches(expected: string, value: unknown): boolean {
  const actual = typeOf(value);
  return actual === expected || (expected === 'number' && actual === 'integer');
}

function scalarErrors(node: SchemaNode, value: unknown, at: string): string[] {
  const errors: string[] = [];
  if (node.enum !== undefined && !node.enum.includes(value)) {
    errors.push(`${at}: ${String(value)} not in enum`);
  }
  if (typeof value === 'string' && node.pattern !== undefined && !new RegExp(node.pattern).test(value)) {
    errors.push(`${at}: does not match ${node.pattern}`);
  }
  if (typeof value === 'string' && value.length < (node.minLength ?? 0)) {
    errors.push(`${at}: shorter than ${String(node.minLength)}`);
  }
  if (typeof value === 'number' && node.minimum !== undefined && value < node.minimum) {
    errors.push(`${at}: below ${node.minimum}`);
  }
  return errors;
}

function nodeErrors(raw: SchemaNode, value: unknown, at: string): string[] {
  const node = raw.$ref !== undefined ? ROOT.$defs[raw.$ref.slice(REF_PREFIX.length)] ?? {} : raw;
  if (node.type !== undefined && !typeMatches(node.type, value)) {
    return [`${at}: expected ${node.type}, got ${typeOf(value)}`];
  }
  const errors = scalarErrors(node, value, at);
  if (Array.isArray(value) && node.items !== undefined) {
    const items = node.items;
    value.forEach((item, index) => errors.push(...nodeErrors(items, item, `${at}[${index}]`)));
  }
  if (typeOf(value) === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of node.required ?? []) {
      if (!(key in record)) {
        errors.push(`${at}.${key}: required`);
      }
    }
    for (const [key, child] of Object.entries(node.properties ?? {})) {
      if (key in record) {
        errors.push(...nodeErrors(child, record[key], `${at}.${key}`));
      }
    }
  }
  return errors;
}

/**
 * Checks a document against the copied `testdoc-results.v1` JSON Schema (the keyword subset it uses).
 * @returns one message per violation; empty when the document conforms
 */
export function schemaErrors(doc: unknown): string[] {
  return nodeErrors(ROOT, doc, '$');
}
