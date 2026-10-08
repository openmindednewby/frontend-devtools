import type { Framework } from './Framework';
import type { TestStatus } from './TestStatus';

export interface RunInfo {
  name: string;
  repo?: string;
  sha?: string;
  startedAt?: string;
  finishedAt?: string;
}

export interface RequirementRecord {
  id: string;
  title: string;
  source: string;
}

export interface TestRecord {
  id: string;
  framework: Framework;
  project: string;
  set: string;
  expectRed: boolean;
  feature: string;
  class: string;
  method: string;
  description: string;
  scenario: string;
  expected: string;
  covers: string[];
  status: TestStatus;
  seconds: number;
  message: string;
  stack: string;
}

export interface TestdocResults {
  schema: string;
  run: RunInfo;
  requirements: RequirementRecord[];
  tests: TestRecord[];
}

export type SourceReader = (file: string) => string | undefined;

export interface ReporterOptions {
  outputFile?: string;
  rootDir?: string;
  project?: string;
  set?: string;
  run?: Partial<RunInfo>;
}
