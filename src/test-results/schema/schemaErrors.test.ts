import { schemaErrors } from './schemaErrors';

const VALID_TEST = { id: 'a > b', framework: 'jest', project: 'p', set: 'baseline', status: 'pass' };

function docWith(test: Record<string, unknown>, schema = 'testdoc-results.v1'): Record<string, unknown> {
  return { schema, run: { name: '2026-10-08T10-24' }, requirements: [], tests: [test] };
}

describe('schemaErrors', () => {
  it('with a conforming document, returns no errors', () => {
    const doc = docWith(VALID_TEST);

    const errors = schemaErrors(doc);

    expect(errors).toEqual([]);
  });

  it('with a test missing set and an unknown status, names both fields', () => {
    const { set: _set, ...withoutSet } = VALID_TEST;

    const errors = schemaErrors(docWith({ ...withoutSet, status: 'passed' }));

    expect(errors).toEqual(['$.tests[0].set: required', '$.tests[0].status: passed not in enum']);
  });

  it('with a v2 schema name, reports the pattern mismatch', () => {
    const doc = docWith(VALID_TEST, 'testdoc-results.v2');

    const errors = schemaErrors(doc);

    expect(errors).toHaveLength(1);
  });
});
