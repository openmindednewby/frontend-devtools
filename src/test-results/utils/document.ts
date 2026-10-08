import { mkdirSync, writeFileSync } from 'fs';
import { dirname } from 'path';

import { SCHEMA_ID } from '../constants';
import type { RequirementRecord, RunInfo, TestRecord, TestdocResults } from '../types';

const RUN_NAME_LENGTH = 19;
const JSON_INDENT = 2;

export function runName(startedAt: Date): string {
  return startedAt.toISOString().slice(0, RUN_NAME_LENGTH).split(':').join('-');
}

export function buildDocument(
  run: RunInfo,
  requirements: RequirementRecord[],
  tests: TestRecord[],
): TestdocResults {
  return { schema: SCHEMA_ID, run, requirements, tests };
}

export function runInfo(startedAt: Date, finishedAt: Date, overrides?: Partial<RunInfo>): RunInfo {
  return {
    name: runName(startedAt),
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    ...overrides,
  };
}

export function writeResults(outputFile: string, doc: TestdocResults): void {
  mkdirSync(dirname(outputFile), { recursive: true });
  writeFileSync(outputFile, `${JSON.stringify(doc, null, JSON_INDENT)}\n`, 'utf8');
}
