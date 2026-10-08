import Ajv2020 from 'ajv/dist/2020';

import schemaJson from './testdoc-results.v1.schema.json';

const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schemaJson);

/**
 * Validates a document against the copied `testdoc-results.v1` JSON Schema with ajv (draft 2020-12).
 * @returns one message per violation; empty when the document conforms
 */
export function validationErrors(doc: unknown): string[] {
  if (validate(doc)) {
    return [];
  }
  return (validate.errors ?? []).map((error) => `${error.instancePath} ${error.message ?? ''}`.trim());
}
