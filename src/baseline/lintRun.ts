import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { SeverityResult } from './splitResults';

import { GATED_RULES } from './gatedRules';
import { buildOverlay, OVERLAY_FILE } from './lintOverlay';

const CONFIG_NAMES = ['eslint.config.mjs', 'eslint.config.js', 'eslint.config.cjs'];
const ESLINT_FATAL = 2;

export interface LintRunResult {
  results: SeverityResult[];
  status: number;
}

interface FormatterLike {
  format: (input: SeverityResult[]) => string | Promise<string>;
}

interface EslintModuleLike {
  ESLint: new (options: { cwd: string }) => { loadFormatter: (name: string) => Promise<FormatterLike> };
}

function appRequire(cwd: string): NodeJS.Require {
  return createRequire(join(cwd, 'package.json'));
}

function appConfig(cwd: string): string {
  const found = CONFIG_NAMES.find((name) => existsSync(join(cwd, name)));
  if (found === undefined) {
    throw new Error(`eslint-baseline lint: no ${CONFIG_NAMES.join(' / ')} in ${cwd}`);
  }
  return found;
}

/** Runs the app's own ESLint once with the gated rules appended and returns the JSON results. */
export function runEslintWithGatedRules(cwd: string, eslintArgs: string[]): LintRunResult {
  const bin = join(dirname(appRequire(cwd).resolve('eslint/package.json')), 'bin', 'eslint.js');
  const outDir = mkdtempSync(join(tmpdir(), 'eslint-baseline-'));
  const output = join(outDir, 'eslint.json');
  const overlay = join(cwd, OVERLAY_FILE);
  writeFileSync(overlay, buildOverlay(appConfig(cwd), GATED_RULES));
  try {
    const args = [bin, ...eslintArgs, '-c', OVERLAY_FILE, '--ignore-pattern', OVERLAY_FILE, '--format', 'json', '-o', output];
    const run = spawnSync(process.execPath, args, { cwd, stdio: 'inherit', env: { ...process.env, ESLINT_USE_FLAT_CONFIG: 'true' } });
    if (!existsSync(output)) {
      return { results: [], status: ESLINT_FATAL };
    }
    return { results: JSON.parse(readFileSync(output, 'utf8')) as SeverityResult[], status: run.status ?? ESLINT_FATAL };
  } finally {
    rmSync(overlay, { force: true });
    rmSync(outDir, { recursive: true, force: true });
  }
}

/** Formats results with the app's own ESLint stylish formatter. */
export async function formatStylish(cwd: string, results: SeverityResult[]): Promise<string> {
  const eslint = appRequire(cwd)('eslint') as EslintModuleLike;
  const formatter = await new eslint.ESLint({ cwd }).loadFormatter('stylish');
  return formatter.format(results);
}
