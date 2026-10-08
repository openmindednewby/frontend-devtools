import { extractCovers } from './record';

describe('extractCovers', () => {
  it('with a tag declared in the file requirements, counts it as covered', () => {
    const declared = new Set(['REQ.sum-1']);

    const covers = extractCovers(['with two numbers, adds them @REQ.sum-1'], declared);

    expect(covers).toEqual(['REQ.sum-1']);
  });

  it('with an undeclared requirement-shaped tag, still records it so the report shows it undeclared', () => {
    const declared = new Set<string>();

    const covers = extractCovers(['@AC-12', 'with a total, rounds @ER-3'], declared);

    expect(covers).toEqual(['AC-12', 'ER-3']);
  });

  it('with undeclared plain tags, ignores them', () => {
    const declared = new Set(['AC-01']);

    const covers = extractCovers(['@smoke', 'with a slow path, waits @slow @Ac-2 @REQ.x'], declared);

    expect(covers).toEqual([]);
  });
});
