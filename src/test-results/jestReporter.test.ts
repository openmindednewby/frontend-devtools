import { mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import TestdocJestReporter from './jestReporter';
import { schemaErrors } from './schema/schemaErrors';
import type { TestdocResults } from './types';

function runFixture(rootDir: string): { startTime: number; testResults: { testFilePath: string; testResults: { title: string; ancestorTitles: string[]; status: string; duration: number; failureMessages: string[] }[] }[] } {
  const testFilePath = join(rootDir, 'amount.test.ts');
  writeFileSync(testFilePath, `requirements({ 'AC-03': 'Amounts format to two decimals' });`);
  const assertion = (title: string, status: string, failureMessages: string[] = []): { title: string; ancestorTitles: string[]; status: string; duration: number; failureMessages: string[] } => ({
    title,
    ancestorTitles: ['formatAmount'],
    status,
    duration: 5,
    failureMessages,
  });
  return {
    startTime: Date.parse('2026-10-08T10:24:00.000Z'),
    testResults: [
      {
        testFilePath,
        testResults: [
          assertion('with a zero amount, returns "0.00" @AC-03', 'passed'),
          assertion('with a negative amount, returns a minus sign', 'failed', ['Expected -1.00\n    at format.ts:4']),
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
    expect(schemaErrors(doc)).toEqual([]);
  });
});
