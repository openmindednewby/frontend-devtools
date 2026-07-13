/**
 * Regression tests for the `no-null-check` AUTOFIXER.
 *
 * Before these, the fixer rewrote `x === undefined` to `!isValueDefined(x)`
 * without importing `isValueDefined` — so `eslint --fix` happily produced files
 * referencing an undeclared global. Running `lint:fix` on agora-web (ES-04)
 * corrupted ~20 files and produced 67 `no-unsafe-call` errors.
 *
 * A fixer that emits broken code is worse than no fixer: `lint:fix` is the first
 * thing anyone runs.
 */
import { Linter, RuleTester } from 'eslint';

import plugin from './no-null-check.js';

const rule = plugin.rules['no-null-check'] as unknown as Parameters<RuleTester['run']>[1];

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-null-check', rule, {
  valid: [
    { code: 'if (isValueDefined(item)) { doThing(); }' },
    { code: 'if (a === b) { doThing(); }' },
  ],

  invalid: [
    // The regression: a file with NO import of the guard must get one.
    {
      code: 'export function pick(v) {\n  if (v === undefined) return 1;\n  return v;\n}',
      output:
        "import { isValueDefined } from '@dloizides/utils';\n" +
        'export function pick(v) {\n  if (!isValueDefined(v)) return 1;\n  return v;\n}',
      errors: [{ messageId: 'noEqualsUndefined' }],
    },

    // Insertion goes AFTER the last existing import, not above it.
    {
      code: "import { a } from './a';\n\nif (a !== null) { go(); }",
      output:
        "import { a } from './a';\n" +
        "import { isValueDefined } from '@dloizides/utils';\n\nif (isValueDefined(a)) { go(); }",
      errors: [{ messageId: 'noNotEqualsNull' }],
    },

    // Already imported -> rewrite only, no duplicate import.
    {
      code: "import { isValueDefined } from '@dloizides/utils';\nif (x === null) { go(); }",
      output: "import { isValueDefined } from '@dloizides/utils';\nif (!isValueDefined(x)) { go(); }",
      errors: [{ messageId: 'noEqualsNull' }],
    },

    // Imported from a local re-export barrel (`src/utils/is`) also counts as bound.
    {
      code: "import { isValueDefined } from '../utils/is';\nif (x !== undefined) { go(); }",
      output: "import { isValueDefined } from '../utils/is';\nif (isValueDefined(x)) { go(); }",
      errors: [{ messageId: 'noNotEqualsUndefined' }],
    },

    // Several violations in one unimported file. Every report's fix carries the
    // import, so their ranges overlap and RuleTester — which runs a SINGLE fix
    // pass — applies only the first. Real `eslint --fix` runs up to 10 passes and
    // converges; that is asserted in the `verifyAndFix` block below.
    {
      code: 'function f(a, b) {\n  if (a === undefined) return 0;\n  if (b === null) return 1;\n  return 2;\n}',
      output:
        "import { isValueDefined } from '@dloizides/utils';\n" +
        'function f(a, b) {\n  if (!isValueDefined(a)) return 0;\n  if (b === null) return 1;\n  return 2;\n}',
      errors: [{ messageId: 'noEqualsUndefined' }, { messageId: 'noEqualsNull' }],
    },

    // The module that DEFINES the guard must never be given a self-import.
    // Reported, but deliberately not autofixed (output === input).
    {
      code: 'export function isValueDefined(v) {\n  return v !== null;\n}',
      output: null,
      errors: [{ messageId: 'noNotEqualsNull' }],
    },

    // Likewise the barrel that RE-EXPORTS the guard.
    {
      code: "export { isValueDefined } from './guards/isValueDefined';\nif (x === null) { go(); }",
      output: null,
      errors: [{ messageId: 'noEqualsNull' }],
    },

    // A custom import path is honoured.
    {
      code: 'if (x === undefined) { go(); }',
      options: [{ utilImportPath: '@acme/guards' }],
      output: "import { isValueDefined } from '@acme/guards';\nif (!isValueDefined(x)) { go(); }",
      errors: [{ messageId: 'noEqualsUndefined' }],
    },
  ],
});

/**
 * The REAL `eslint --fix` pipeline. `Linter.verifyAndFix` is what the CLI runs:
 * up to 10 passes, re-linting after each. This is the code path that corrupted
 * agora-web, so it is the code path worth asserting on.
 */
describe('no-null-check --fix (multipass, the real pipeline)', () => {
  const linter = new Linter();
  linter.defineRule('local/no-null-check', rule as never);

  const config = {
    parserOptions: { ecmaVersion: 2022 as const, sourceType: 'module' as const },
    rules: { 'local/no-null-check': 'error' as const },
  };

  it('adds exactly one import and rewrites EVERY occurrence', () => {
    const source = [
      'function f(a, b, c) {',
      '  if (a === undefined) return 0;',
      '  if (b === null) return 1;',
      '  if (c !== undefined) return 2;',
      '  return 3;',
      '}',
    ].join('\n');

    const { output, fixed } = linter.verifyAndFix(source, config);

    expect(fixed).toBe(true);
    // Exactly ONE import, despite three violations.
    expect(output.match(/import \{ isValueDefined \}/g)).toHaveLength(1);
    // No raw null/undefined comparison survives.
    expect(output).not.toMatch(/=== undefined|=== null|!== undefined|!== null/);
    expect(output).toContain('!isValueDefined(a)');
    expect(output).toContain('!isValueDefined(b)');
    expect(output).toContain('isValueDefined(c)');
  });

  it('leaves NO residual violations after fixing (the corruption regression)', () => {
    const source = 'export function pick(v) {\n  if (v === undefined) return 1;\n  return v;\n}';

    const { output } = linter.verifyAndFix(source, config);

    // Re-lint the fixed output: the guard is imported, so it is now a real binding
    // rather than the undeclared global the old fixer emitted.
    expect(linter.verify(output, config)).toHaveLength(0);
    expect(output.startsWith("import { isValueDefined } from '@dloizides/utils';")).toBe(true);
  });

  it('never self-imports into the module that defines the guard', () => {
    const source = 'export function isValueDefined(v) {\n  return v !== null;\n}';

    const { output, fixed } = linter.verifyAndFix(source, config);

    expect(fixed).toBe(false);
    expect(output).toBe(source);
    expect(output).not.toContain('import');
  });
});
