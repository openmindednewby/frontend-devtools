import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import TestdocJestReporter, { convertJestResults, type JestAssertion, type JestRunResults } from './jestReporter';
import { validationErrors } from './schema/validateResults';
import type { TestdocResults } from './types';

const ESC = String.fromCharCode(27);

function assertion(title: string, status: string, failureMessages: string[] = []): JestAssertion {
  return { title, ancestorTitles: ['formatAmount'], status, duration: 5, failureMessages };
}

function runFixture(rootDir: string): JestRunResults {
  const testFilePath = join(rootDir, 'amount.test.ts');
  writeFileSync(testFilePath, `requirements({ 'AC-03': 'Amounts format to two decimals' });`);
  return {
    startTime: Date.parse('2026-10-08T10:24:00.000Z'),
    testResults: [
      {
        testFilePath,
        testResults: [
          assertion('with a zero amount, returns "0.00" @AC-03', 'passed'),
          assertion('with a negative amount, returns a minus sign', 'failed', [
            `${ESC}[31mExpected -1.00${ESC}[39m\n    at format.ts:4`,
          ]),
          assertion('with NaN, returns a dash', 'pending'),
        ],
      },
    ],
  };
}

describe('jest reporter', () => {
  it('AC-15: given a Jest run with one pass, one fail and one skip, when the custom reporter runs, then the JSON has three records with correct statuses', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'testdoc-jest-'));
    const reporter = new TestdocJestReporter({}, { rootDir, outputFile: 'out/results.json', project: 'formatting' });

    reporter.onRunComplete({}, runFixture(rootDir));

    const doc = JSON.parse(readFileSync(join(rootDir, 'out/results.json'), 'utf8')) as TestdocResults;
    expect(doc.tests.map((test) => test.status)).toEqual(['pass', 'fail', 'skip']);
    expect(doc.tests[0]?.covers).toEqual(['AC-03']);
    expect(doc.tests[1]).toMatchObject({ message: 'Expected -1.00', stack: '    at format.ts:4' });
    expect(doc.requirements).toEqual([{ id: 'AC-03', title: 'Amounts format to two decimals', source: 'amount.test.ts' }]);
    expect(validationErrors(doc)).toEqual([]);
  });
});

describe('convertJestResults', () => {
  it('with test.failing in source, maps a thrown test to xfail and a passing one to xpass', () => {
    const source = "describe('formatAmount', () => {\ntest.failing('with Infinity, throws', f);\nit.failing(\"with -0, keeps the sign\", f);\n});";
    const run = {
      startTime: 0,
      testResults: [
        {
          testFilePath: '/repo/a.test.ts',
          testResults: [assertion('with Infinity, throws', 'passed'), assertion('with -0, keeps the sign', 'failed')],
        },
      ],
    };

    const doc = convertJestResults(run, { rootDir: '/repo' }, () => source);

    expect(doc.tests.map((test) => [test.status, test.expectRed])).toEqual([
      ['xfail', true],
      ['xpass', true],
    ]);
  });

  it('with the same title failing in one describe only, marks only that test as expected red', () => {
    const source = [
      "describe('parse', () => {",
      "  test.failing('with a tab, throws', f);",
      '});',
      "describe('format', () => {",
      "  test('with a tab, throws', f);",
      '});',
    ].join('\n');
    const inDescribe = (describeTitle: string): JestAssertion => ({
      ...assertion('with a tab, throws', 'passed'),
      ancestorTitles: [describeTitle],
    });
    const run = { startTime: 0, testResults: [{ testFilePath: '/repo/b.test.ts', testResults: [inDescribe('parse'), inDescribe('format')] }] };

    const doc = convertJestResults(run, { rootDir: '/repo' }, () => source);

    expect(doc.tests.map((test) => test.status)).toEqual(['xfail', 'pass']);
  });
});
