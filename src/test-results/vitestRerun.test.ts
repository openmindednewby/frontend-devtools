import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import TestdocVitestReporter from './vitestReporter';
import type { TestdocResults } from './types';

describe('TestdocVitestReporter', () => {
  it('with a watch rerun, rewrites the file for the second run', () => {
    const rootDir = mkdtempSync(join(tmpdir(), 'testdoc-vitest-'));
    const reporter = new TestdocVitestReporter({ rootDir, outputFile: 'r.json' });
    const file = (name: string): { filepath: string; tasks: { type: string; name: string; result: { state: string } }[] } => ({
      filepath: join(rootDir, 'a.test.ts'),
      tasks: [{ type: 'test', name, result: { state: 'pass' } }],
    });
    reporter.onInit();
    reporter.onFinished([file('first run')]);

    reporter.onWatcherRerun();
    reporter.onFinished([file('second run')]);

    const doc = JSON.parse(readFileSync(join(rootDir, 'r.json'), 'utf8')) as TestdocResults;
    expect(doc.tests.map((test) => test.method)).toEqual(['second run']);
  });
});
