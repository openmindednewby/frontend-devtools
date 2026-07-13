/**
 * Tests for `smart-max-lines`, in particular that `functionWarn` is OFF by default.
 *
 * ESLint has no per-report severity: every report a rule makes is emitted at the
 * severity the *rule* is configured with. So the old `FUNCTION_WARN_DEFAULT = 30`
 * meant a rule configured as 'error' (as every app configures it) errored on any
 * function over 30 lines — while the docs promised 50. The rule lied about its own
 * threshold. `functionWarn` is now opt-in.
 */
import { RuleTester } from 'eslint';

import plugin from './smart-max-lines.js';

const rule = plugin.rules['smart-max-lines'] as unknown as Parameters<RuleTester['run']>[1];

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

/** A regular (non-JSX) function body of exactly `n` counted statement lines. */
function fnOfLines(n: number): string {
  const body = Array.from({ length: n }, (_, i) => `  const v${String(i)} = ${String(i)};`);
  return `function big() {\n${body.join('\n')}\n}`;
}

ruleTester.run('smart-max-lines', rule, {
  valid: [
    // 40 lines: over the old phantom 30 "warning", but under the documented 50.
    // This is the regression case — it used to ERROR.
    { code: fnOfLines(40) },
    // Exactly at the documented limit.
    { code: fnOfLines(48) },
    // functionWarn stays available as an explicit, stricter threshold.
    { code: fnOfLines(20), options: [{ functionWarn: 30 }] },
  ],

  invalid: [
    // Over the documented 50 -> a real error, unchanged.
    {
      code: fnOfLines(60),
      errors: [{ messageId: 'functionTooLong' }],
    },
    // Opting in to the stricter threshold still works.
    {
      code: fnOfLines(40),
      options: [{ functionWarn: 30 }],
      errors: [{ messageId: 'functionWarning' }],
    },
  ],
});
