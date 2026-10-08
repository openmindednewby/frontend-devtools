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

interface FileScope {
  file: string;
  project: string;
  set: string;
  failing: Set<string>;
  declared: ReadonlySet<string>;
}

const PASSED = 'passed';
const FAILED = 'failed';
const LINE_BREAK = '\n';
const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');
const FAILING_RE = /\b(?:it|test)\.failing\(\s*(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;

export function failingTitles(source: string | undefined): Set<string> {
  return new Set([...(source ?? '').matchAll(FAILING_RE)].map((match) => match[2] ?? ''));
}

function jestStatus(status: string, failing: boolean): TestStatus {
  if (status !== PASSED && status !== FAILED) {
    return TestStatus.Skip;
  }
  if (failing) {
    return status === PASSED ? TestStatus.XFail : TestStatus.XPass;
  }
  return status === PASSED ? TestStatus.Pass : TestStatus.Fail;
}

function toRecord(scope: FileScope, assertion: JestAssertion): TestRecord {
  const failure = (assertion.failureMessages?.[0] ?? '').replace(ANSI_RE, '');
  const lineEnd = failure.indexOf(LINE_BREAK);
  const failing = scope.failing.has(assertion.title);
  return buildRecord({
    framework: Framework.Jest,
    file: scope.file,
    describePath: assertion.ancestorTitles,
    title: assertion.title,
    status: jestStatus(assertion.status, failing),
    expectRed: failing,
    durationMs: assertion.duration ?? 0,
    message: lineEnd < 0 ? failure : failure.slice(0, lineEnd),
    stack: lineEnd < 0 ? '' : failure.slice(lineEnd + 1),
    project: scope.project,
    set: scope.set,
    declared: scope.declared,
  });
}

/**
 * Converts a Jest aggregated result into `testdoc-results.v1`; `test.failing` is found by source scan.
 * @returns the results document
 */
export function convertJestResults(
  results: JestRunResults,
  options: ReporterOptions = {},
  readSource?: SourceReader,
): TestdocResults {
  const rootDir = options.rootDir ?? process.cwd();
  const read = readSource ?? fileReader(rootDir);
  const project = options.project ?? defaultProject(rootDir);
  const set = options.set ?? DEFAULT_SET;
  const found = requirementsFromFiles(results.testResults.map((result) => result.testFilePath), read, rootDir);
  const tests = results.testResults.flatMap((result) => {
    const scope: FileScope = {
      file: relativePath(rootDir, result.testFilePath),
      project,
      set,
      failing: failingTitles(read(result.testFilePath)),
      declared: found.declaredIn(result.testFilePath),
    };
    return result.testResults.map((assertion) => toRecord(scope, assertion));
  });
  return buildDocument(runInfo(new Date(results.startTime), new Date(), options.run), found.requirements, tests);
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
