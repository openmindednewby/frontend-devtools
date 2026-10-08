import { schemaErrors } from './schema/schemaErrors';
import { convertVitestFiles } from './vitestReporter';

describe('convertVitestFiles', () => {
  it('with pass, fail, skip and both test.fails outcomes, maps to the five testdoc statuses', () => {
    const files = [
      {
        filepath: '/repo/src/sum.test.ts',
        tasks: [
          {
            type: 'suite',
            name: 'sum',
            tasks: [
              { type: 'test', name: 'with two numbers, adds them @AC-02', result: { state: 'pass' } },
              { type: 'test', name: 'with NaN, throws', result: { state: 'fail', errors: [{ message: 'no throw' }] } },
              { type: 'test', name: 'with bigint, adds them', mode: 'skip' },
              { type: 'test', name: 'with overflow, wraps', fails: true, result: { state: 'pass' } },
              { type: 'test', name: 'with strings, concatenates', fails: true, result: { state: 'fail' } },
            ],
          },
        ],
      },
    ];

    const doc = convertVitestFiles(files, { rootDir: '/repo', project: 'math' }, () => `requirements({ AC_02: 'Sums' })`);

    expect(doc.tests.map((test) => test.status)).toEqual(['pass', 'fail', 'skip', 'xfail', 'xpass']);
    expect(doc.tests[0]?.covers).toEqual(['AC-02']);
    expect(doc.requirements).toEqual([{ id: 'AC_02', title: 'Sums', source: 'src/sum.test.ts' }]);
    expect(schemaErrors(doc)).toEqual([]);
  });
});
