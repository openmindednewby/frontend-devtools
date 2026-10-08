import { readFileSync } from 'fs';

import { DEFAULT_SET } from './constants';
import { Framework } from './Framework';
import { TestStatus } from './TestStatus';
import type { RunInfo, SourceReader, TestRecord, TestdocResults } from './types';
import { buildDocument, runInfo, writeResults } from './utils/document';
import { fileReader } from './utils/paths';
import { buildRecord } from './utils/record';
import { requirementsFromFiles } from './utils/sourceRequirements';

export interface PlaywrightResult {
  status?: string;
  duration?: number;
  error?: { message?: string; stack?: string };
}

export interface PlaywrightTest {
  expectedStatus: string;
  projectName?: string;
  results: PlaywrightResult[];
}

export interface PlaywrightSpec {
  title: string;
  file: string;
  tags?: string[];
  tests: PlaywrightTest[];
}

export interface PlaywrightSuite {
  title: string;
  file: string;
  specs?: PlaywrightSpec[];
  suites?: PlaywrightSuite[];
}

export interface PlaywrightReport {
  config?: { rootDir?: string };
  stats?: { startTime?: string; duration?: number };
  suites: PlaywrightSuite[];
}

export interface PlaywrightConvertOptions {
  rootDir?: string;
  readSource?: SourceReader;
  set?: string;
  run?: Partial<RunInfo>;
}

interface PlacedSpec {
  spec: PlaywrightSpec;
  describePath: string[];
}

const EXPECTED_FAILED = 'failed';
const SKIPPED = 'skipped';
const PASSED = 'passed';

export function playwrightStatus(expectedStatus: string, actual: string | undefined): TestStatus {
  if (expectedStatus === SKIPPED || actual === SKIPPED || actual === undefined) {
    return TestStatus.Skip;
  }
  const passed = actual === PASSED;
  if (expectedStatus === EXPECTED_FAILED) {
    return passed ? TestStatus.XPass : TestStatus.XFail;
  }
  return passed ? TestStatus.Pass : TestStatus.Fail;
}

function placeSpecs(suite: PlaywrightSuite, path: string[], out: PlacedSpec[]): void {
  const isDescribe = suite.title !== '' && suite.title !== suite.file;
  const describePath = isDescribe ? [...path, suite.title] : path;
  for (const spec of suite.specs ?? []) {
    out.push({ spec, describePath });
  }
  for (const child of suite.suites ?? []) {
    placeSpecs(child, describePath, out);
  }
}

function toRecords({ spec, describePath }: PlacedSpec, set: string): TestRecord[] {
  return spec.tests.map((test) => {
    const last = test.results[test.results.length - 1];
    return buildRecord({
      framework: Framework.Playwright,
      file: spec.file,
      describePath,
      title: spec.title,
      tags: spec.tags,
      status: playwrightStatus(test.expectedStatus, last?.status),
      expectRed: test.expectedStatus === EXPECTED_FAILED,
      durationMs: last?.duration ?? 0,
      message: last?.error?.message,
      stack: last?.error?.stack,
      project: test.projectName !== undefined && test.projectName !== '' ? test.projectName : Framework.Playwright,
      set,
    });
  });
}

/**
 * Converts a Playwright JSON-reporter report into `testdoc-results.v1`.
 * @returns the results document; requirements come from literal `requirements({...})` calls in each spec
 */
export function convertPlaywrightReport(
  report: PlaywrightReport,
  options: PlaywrightConvertOptions = {},
): TestdocResults {
  const rootDir = options.rootDir ?? report.config?.rootDir ?? process.cwd();
  const placed: PlacedSpec[] = [];
  for (const suite of report.suites) {
    placeSpecs(suite, [], placed);
  }
  const startedAt = new Date(report.stats?.startTime ?? Date.now());
  const finishedAt = new Date(startedAt.getTime() + (report.stats?.duration ?? 0));
  const files = placed.map(({ spec }) => spec.file);
  const readSource = options.readSource ?? fileReader(rootDir);
  return buildDocument(
    runInfo(startedAt, finishedAt, options.run),
    requirementsFromFiles(files, readSource, rootDir),
    placed.flatMap((entry) => toRecords(entry, options.set ?? DEFAULT_SET)),
  );
}

export function convertPlaywrightFile(
  inputFile: string,
  outputFile: string,
  options: PlaywrightConvertOptions = {},
): TestdocResults {
  const report = JSON.parse(readFileSync(inputFile, 'utf8')) as PlaywrightReport;
  const doc = convertPlaywrightReport(report, options);
  writeResults(outputFile, doc);
  return doc;
}
