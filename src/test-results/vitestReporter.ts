import { resolve } from 'path';

import { DEFAULT_OUTPUT_FILE, DEFAULT_SET } from './constants';
import { Framework } from './Framework';
import { TestStatus } from './TestStatus';
import type { ReporterOptions, SourceReader, TestRecord, TestdocResults } from './types';
import { buildDocument, runInfo, writeResults } from './utils/document';
import { defaultProject, fileReader, relativePath } from './utils/paths';
import { buildRecord } from './utils/record';
import { requirementsFromFiles } from './utils/sourceRequirements';

export interface VitestTask {
  type: string;
  name: string;
  mode?: string;
  fails?: boolean;
  tasks?: VitestTask[];
  result?: { state?: string; duration?: number; errors?: { message?: string; stack?: string }[] };
}

export interface VitestFile {
  filepath: string;
  tasks: VitestTask[];
}

const SUITE = 'suite';
const STATE_PASS = 'pass';
const STATE_FAIL = 'fail';
const NOT_RUN_MODES = new Set(['skip', 'todo']);

export function vitestStatus(task: VitestTask): TestStatus {
  const state = task.result?.state;
  const ran = state === STATE_PASS || state === STATE_FAIL;
  if (!ran || NOT_RUN_MODES.has(task.mode ?? '')) {
    return TestStatus.Skip;
  }
  if (task.fails === true) {
    return state === STATE_PASS ? TestStatus.XFail : TestStatus.XPass;
  }
  return state === STATE_PASS ? TestStatus.Pass : TestStatus.Fail;
}

interface CollectScope {
  file: string;
  project: string;
  set: string;
  declared: ReadonlySet<string>;
  out: TestRecord[];
}

function collect(scope: CollectScope, tasks: VitestTask[], path: string[]): void {
  for (const task of tasks) {
    if (task.type === SUITE) {
      collect(scope, task.tasks ?? [], [...path, task.name]);
      continue;
    }
    const error = task.result?.errors?.[0];
    scope.out.push(
      buildRecord({
        framework: Framework.Vitest,
        file: scope.file,
        describePath: path,
        title: task.name,
        status: vitestStatus(task),
        expectRed: task.fails === true,
        durationMs: task.result?.duration ?? 0,
        message: error?.message,
        stack: error?.stack,
        project: scope.project,
        set: scope.set,
        declared: scope.declared,
      }),
    );
  }
}

export interface VitestConvertOptions extends ReporterOptions {
  startedAt?: Date;
}

export function convertVitestFiles(
  files: VitestFile[],
  options: VitestConvertOptions = {},
  readSource?: SourceReader,
): TestdocResults {
  const rootDir = options.rootDir ?? process.cwd();
  const tests: TestRecord[] = [];
  const project = options.project ?? defaultProject(rootDir);
  const set = options.set ?? DEFAULT_SET;
  const paths = files.map((file) => file.filepath);
  const found = requirementsFromFiles(paths, readSource ?? fileReader(rootDir), rootDir);
  for (const file of files) {
    const declared = found.declaredIn(file.filepath);
    collect({ file: relativePath(rootDir, file.filepath), project, set, declared, out: tests }, file.tasks, []);
  }
  return buildDocument(runInfo(options.startedAt ?? new Date(), new Date(), options.run), found.requirements, tests);
}

/** Vitest custom reporter that writes `testdoc-results.v1` once per run (Vitest 3 `onTestRunEnd`, else `onFinished`). */
export default class TestdocVitestReporter {
  private readonly options: ReporterOptions;
  private startedAt = new Date();
  private written = false;

  constructor(options: ReporterOptions = {}) {
    this.options = options;
  }

  onInit(): void {
    this.startedAt = new Date();
    this.written = false;
  }

  onTestRunEnd(modules: readonly { task: VitestFile }[] = []): void {
    this.write(modules.map((module) => module.task));
  }

  onFinished(files: VitestFile[] = []): void {
    this.write(files);
  }

  private write(files: VitestFile[]): void {
    if (this.written) {
      return;
    }
    this.written = true;
    const rootDir = this.options.rootDir ?? process.cwd();
    const outputFile = resolve(rootDir, this.options.outputFile ?? DEFAULT_OUTPUT_FILE);
    writeResults(outputFile, convertVitestFiles(files, { ...this.options, startedAt: this.startedAt }));
  }
}
