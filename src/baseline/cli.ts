#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import type { Baseline, CountChange, GateReport, LintResultLike } from './countGate';
import type { GateArgs } from './gateArgs';

import { compareBaseline, countViolations, gatePasses, totalsPerRule } from './countGate';
import { parseGateArgs } from './gateArgs';
import { GateMode } from './GateMode';
import { parseLintArgs } from './lintArgs';
import { formatStylish, runEslintWithGatedRules } from './lintRun';
import { ungatedFails, ungatedResults } from './splitResults';

const EXIT_OK = 0;
const EXIT_GATE_FAILED = 1;
const EXIT_USAGE = 2;

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function describe(label: string, entries: CountChange[]): string[] {
  return entries.map((entry) => `${label} ${entry.file} ${entry.ruleId}: baseline ${entry.baseline}, actual ${entry.actual}`);
}

function reportLines(report: GateReport): string[] {
  return [...describe('rise', report.rises), ...describe('new file', report.newFiles), ...describe('stale', report.stale)];
}

function write(path: string, actual: Baseline): number {
  writeFileSync(path, `${JSON.stringify(actual, null, 2)}\n`);
  process.stdout.write(`wrote ${path}: ${JSON.stringify(totalsPerRule(actual))}\n`);
  return EXIT_OK;
}

function check(path: string, actual: Baseline): number {
  const baseline = existsSync(path) ? readJson<Baseline>(path) : {};
  const report = compareBaseline(baseline, actual);
  reportLines(report).forEach((line) => process.stdout.write(`${line}\n`));
  const passes = gatePasses(report);
  process.stdout.write(`eslint-baseline ${passes ? 'passed' : 'failed'}: ${JSON.stringify(totalsPerRule(actual))}\n`);
  return passes ? EXIT_OK : EXIT_GATE_FAILED;
}

async function lint(args: GateArgs): Promise<number> {
  const { eslintArgs, maxWarnings } = parseLintArgs(args.passthrough);
  const run = runEslintWithGatedRules(args.root, eslintArgs);
  if (run.status === EXIT_USAGE) {
    return EXIT_USAGE;
  }
  const ungated = ungatedResults(run.results);
  process.stdout.write(await formatStylish(args.root, ungated.results));
  const lintFails = ungatedFails(ungated, maxWarnings);
  if (lintFails) {
    process.stdout.write(`eslint failed: ${ungated.errors} errors, ${ungated.warnings} warnings outside the gate (max-warnings ${maxWarnings})\n`);
  }
  const gateResult = check(args.baseline, countViolations(run.results, args.root));
  return lintFails ? EXIT_GATE_FAILED : gateResult;
}

async function run(argv: string[]): Promise<number> {
  try {
    const args = parseGateArgs(argv, process.cwd());
    if (args.mode === GateMode.Lint) {
      return await lint(args);
    }
    const actual = countViolations(readJson<LintResultLike[]>(args.input), args.root);
    return args.mode === GateMode.Write ? write(args.baseline, actual) : check(args.baseline, actual);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return EXIT_USAGE;
  }
}

void run(process.argv.slice(2)).then((code) => {
  process.exitCode = code;
});
