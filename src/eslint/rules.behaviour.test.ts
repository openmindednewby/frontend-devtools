import { RuleTester } from 'eslint';

import { rules } from './plugin';

// ESLint's RuleTester registers its own describe/it via the global test runner,
// so `.run()` is called at the top level (not nested inside a jest `it()`, which
// RuleTester forbids). ESLint 8's RuleTester uses the eslintrc config shape.

// Plain-JS parser RuleTester (for AST that exists in vanilla ESTree).
const jsTester = new RuleTester({
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

// TypeScript-AST RuleTester (for TS-only nodes: TSUnionType, TSTypeAliasDeclaration).
const tsTester = new RuleTester({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

// no-null-check — representative fixable JS rule.
jsTester.run('no-null-check', rules['no-null-check'], {
  valid: [
    { code: 'if (isValueDefined(x)) doThing();' },
    { code: 'if (a === b) doThing();' },
  ],
  invalid: [
    {
      code: 'const ok = x !== null;',
      output: 'const ok = isValueDefined(x);',
      errors: [{ messageId: 'noNotEqualsNull' }],
    },
    {
      code: 'const ok = x === null;',
      output: 'const ok = !isValueDefined(x);',
      errors: [{ messageId: 'noEqualsNull' }],
    },
    {
      code: 'const ok = x !== undefined;',
      output: 'const ok = isValueDefined(x);',
      errors: [{ messageId: 'noNotEqualsUndefined' }],
    },
    {
      code: 'const ok = x === undefined;',
      output: 'const ok = !isValueDefined(x);',
      errors: [{ messageId: 'noEqualsUndefined' }],
    },
  ],
});

// prefer-const-enum — representative TS-AST rule.
tsTester.run('prefer-const-enum', rules['prefer-const-enum'], {
  valid: [
    { code: "type Single = 'only';" },
    { code: 'type Nullable = Foo | null;' },
    { code: "type Mixed = 'a' | number;" },
  ],
  invalid: [
    {
      code: "type Mode = 'light' | 'dark';",
      errors: [{ messageId: 'preferConstEnum' }],
    },
    {
      code: "export type Status = 'active' | 'inactive' | 'pending';",
      errors: [{ messageId: 'preferConstEnum' }],
    },
  ],
});

// no-optional-undefined — representative TS-AST rule.
tsTester.run('no-optional-undefined', rules['no-optional-undefined'], {
  valid: [
    { code: 'interface A { pageCount?: number; }' },
    { code: 'function foo(bar?: string) {}' },
  ],
  invalid: [
    {
      code: 'interface A { pageCount?: number | undefined; }',
      errors: [{ messageId: 'noOptionalUndefined' }],
    },
    {
      code: 'function foo(bar?: string | undefined) {}',
      errors: [{ messageId: 'noOptionalUndefined' }],
    },
  ],
});
