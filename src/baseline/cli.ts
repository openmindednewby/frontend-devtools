#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import type { Baseline, CountChange, GateReport, LintResultLike } from './countGate';

import { compareBaseline, countViolations, gatePasses, totalsPerRule } from './countGate';
import { parseGateArgs } from './gateArgs';
import { GateMode } from './GateMode';

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

function run(argv: string[]): number {
  try {
    const args = parseGateArgs(argv, process.cwd());
    const actual = countViolations(readJson<LintResultLike[]>(args.input), args.root);
    return args.mode === GateMode.Write ? write(args.baseline, actual) : check(args.baseline, actual);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return EXIT_USAGE;
  }
}

process.exitCode = run(process.argv.slice(2));
