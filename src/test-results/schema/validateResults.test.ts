import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

import { validationErrors } from './validateResults';

const COPY = resolve(__dirname, 'testdoc-results.v1.schema.json');
const SOURCE = resolve(__dirname, '../../../../../../NuGetPackages/Dloizides.Testing/schema/testdoc-results.v1.schema.json');
const SOURCE_PRESENT = existsSync(SOURCE);
const VALID_TEST = { id: 'a > b', framework: 'jest', project: 'p', set: 'baseline', status: 'pass' };

function docWith(test: Record<string, unknown>, schema = 'testdoc-results.v1'): Record<string, unknown> {
  return { schema, run: { name: '2026-10-08T10-24-00' }, requirements: [], tests: [test] };
}

describe('validationErrors', () => {
  it('with a conforming document, returns no errors', () => {
    const doc = docWith(VALID_TEST);

    const errors = validationErrors(doc);

    expect(errors).toEqual([]);
  });

  it('with a test missing set and an unknown status, reports both', () => {
    const { set: _set, ...withoutSet } = VALID_TEST;

    const errors = validationErrors(docWith({ ...withoutSet, status: 'passed' }));

    expect(errors).toHaveLength(2);
  });

  it('with a v2 schema name, reports the pattern mismatch', () => {
    const doc = docWith(VALID_TEST, 'testdoc-results.v2');

    const errors = validationErrors(doc);

    expect(errors.join()).toContain('/schema');
  });
});

const SKIP_REASON = `SKIPPED schema-copy check: Dloizides.Testing source not found at ${SOURCE}; copy unverified`;

describe('schema copy', () => {
  if (!SOURCE_PRESENT) {
    console.warn(SKIP_REASON);
  }

  (SOURCE_PRESENT ? it : it.skip)(
    SOURCE_PRESENT ? 'with the Dloizides.Testing repo beside this one, equals its schema' : SKIP_REASON,
    () => {
      const source: unknown = JSON.parse(readFileSync(SOURCE, 'utf8'));

      const copy: unknown = JSON.parse(readFileSync(COPY, 'utf8'));

      expect(copy).toEqual(source);
    },
  );
});
