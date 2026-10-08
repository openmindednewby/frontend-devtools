import { resolve } from 'path';

import { DEFAULT_OUTPUT_FILE, DEFAULT_SET } from './constants';
import { Framework } from './Framework';
import { TestStatus } from './TestStatus';
import type { ReporterOptions, SourceReader, TestRecord, TestdocResults } from './types';
import { buildDocument, runInfo, writeResults } from './utils/document';
import { defaultProject, fileReader, relativePath } from './utils/paths';
import { buildRecord } from './utils/record';
import { requirementsFromFiles } from './utils/sourceRequirements';

export interface JestAssertion {
  title: string;
  ancestorTitles: string[];
  status: string;
  duration?: number | null;
  failureMessages?: string[];
}

export interface JestFileResult {
  testFilePath: string;
  testResults: JestAssertion[];
}

export interface JestRunResults {
  startTime: number;
  testResults: JestFileResult[];
}

const STATUS_BY_JEST: Record<string, TestStatus | undefined> = {
  passed: TestStatus.Pass,
  failed: TestStatus.Fail,
};

const LINE_BREAK = '\n';

function toRecord(options: Required<Pick<ReporterOptions, 'rootDir' | 'project' | 'set'>>, file: string, assertion: JestAssertion): TestRecord {
  const { rootDir, project, set } = options;
  const failure = assertion.failureMessages?.[0] ?? '';
  const lineEnd = failure.indexOf(LINE_BREAK);
  return buildRecord({
    framework: Framework.Jest,
    file: relativePath(rootDir, file),
    describePath: assertion.ancestorTitles,
    title: assertion.title,
    status: STATUS_BY_JEST[assertion.status] ?? TestStatus.Skip,
    expectRed: false,
    durationMs: assertion.duration ?? 0,
    message: lineEnd < 0 ? failure : failure.slice(0, lineEnd),
    stack: lineEnd < 0 ? '' : failure.slice(lineEnd + 1),
    project,
    set,
  });
}

export function convertJestResults(
  results: JestRunResults,
  options: ReporterOptions = {},
  readSource?: SourceReader,
): TestdocResults {
  const rootDir = options.rootDir ?? process.cwd();
  const files = results.testResults.map((file) => file.testFilePath);
  const scope = { rootDir, project: options.project ?? defaultProject(rootDir), set: options.set ?? DEFAULT_SET };
  const tests = results.testResults.flatMap((file) =>
    file.testResults.map((assertion) => toRecord(scope, file.testFilePath, assertion)),
  );
  return buildDocument(
    runInfo(new Date(results.startTime), new Date(), options.run),
    requirementsFromFiles(files, readSource ?? fileReader(rootDir), rootDir),
    tests,
  );
}

/** Jest custom reporter that writes `testdoc-results.v1` when the run completes. */
export default class TestdocJestReporter {
  private readonly options: ReporterOptions;

  constructor(_globalConfig: unknown, options: ReporterOptions = {}) {
    this.options = options;
  }

  onRunComplete(_contexts: unknown, results: JestRunResults): void {
    const rootDir = this.options.rootDir ?? process.cwd();
    const outputFile = resolve(rootDir, this.options.outputFile ?? DEFAULT_OUTPUT_FILE);
    writeResults(outputFile, convertJestResults(results, this.options));
  }
}
