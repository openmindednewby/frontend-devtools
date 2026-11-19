import { BASELINE_RULE_IDS } from './countGate';
import { GATED_RULES } from './gatedRules';
import { parseLintArgs } from './lintArgs';
import { buildOverlay } from './lintOverlay';
import { ungatedFails, ungatedResults } from './splitResults';

const MEMBER = '@typescript-eslint/member-ordering';

function result(messages: Array<{ ruleId: string | null; severity: number }>): { filePath: string; messages: Array<{ ruleId: string | null; severity: number }>; errorCount: number; warningCount: number } {
  return { filePath: '/app/src/a.ts', messages, errorCount: messages.length, warningCount: 0 };
}

describe('GATED_RULES', () => {
  it('with the gate rule list, configures exactly the baselined rule ids', () => {
    const expected = [...BASELINE_RULE_IDS].sort();

    const actual = Object.keys(GATED_RULES).sort();

    expect(actual).toEqual(expected);
  });
});

describe('ungatedResults', () => {
  it('with only gated errors, leaves zero errors so plain lint passes', () => {
    const results = [result([{ ruleId: MEMBER, severity: 2 }, { ruleId: 'max-lines', severity: 2 }])];

    const summary = ungatedResults(results);

    expect({ errors: summary.errors, fails: ungatedFails(summary, 0) }).toEqual({ errors: 0, fails: false });
  });

  it('with one ungated error beside a gated one, keeps the ungated error and fails', () => {
    const results = [result([{ ruleId: MEMBER, severity: 2 }, { ruleId: 'no-console', severity: 2 }])];

    const summary = ungatedResults(results);

    expect({ errors: summary.errors, fails: ungatedFails(summary, -1) }).toEqual({ errors: 1, fails: true });
  });

  it('with one warning and max-warnings 0, fails', () => {
    const results = [result([{ ruleId: 'no-console', severity: 1 }])];

    const fails = ungatedFails(ungatedResults(results), 0);

    expect(fails).toBe(true);
  });

  it('with one warning and no warning cap, passes', () => {
    const results = [result([{ ruleId: 'no-console', severity: 1 }])];

    const fails = ungatedFails(ungatedResults(results), -1);

    expect(fails).toBe(false);
  });
});

describe('parseLintArgs', () => {
  it('with src and --max-warnings 0, strips the cap and keeps the target', () => {
    const passthrough = ['src', '--ext', '.ts,.tsx', '--max-warnings', '0'];

    const args = parseLintArgs(passthrough);

    expect(args).toEqual({ eslintArgs: ['src', '--ext', '.ts,.tsx'], maxWarnings: 0 });
  });

  it('with only flags, defaults the target to the current directory', () => {
    const passthrough = ['--ext', '.ts', '--cache'];

    const args = parseLintArgs(passthrough);

    expect(args).toEqual({ eslintArgs: ['--ext', '.ts', '--cache', '.'], maxWarnings: -1 });
  });
});

describe('buildOverlay', () => {
  it('with eslint.config.js, imports it and appends max-lines and the member-order plugins', () => {
    const configFile = 'eslint.config.js';

    const overlay = buildOverlay(configFile, GATED_RULES);

    expect([overlay.includes('import("./eslint.config.js")'), overlay.includes('"max-lines"'), overlay.includes('member-order-fields/member-ordering')]).toEqual([true, true, true]);
  });
});
