import { Linter, RuleTester } from 'eslint';

import { commentsConfig, COMMENT_RULE_NAMES } from './configs';
import { rules } from './plugin';

const src = (code: string): string => code.replace(/~/g, '/');

const tsTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

const jsTester = new RuleTester({
  parserOptions: { ecmaVersion: 2022, sourceType: 'script' },
});

tsTester.run('no-comments', rules['no-comments'], {
  valid: [
    { code: 'const a = 1;' },
    { code: src('~** Public thing. */\nexport const a = 1;') },
    { code: src('~~ eslint-disable-next-line no-console\nconsole.log(1);') },
    { code: src('~* eslint-disable */\nconst a = 1;') },
    { code: src('~~ @ts-expect-error legacy\nconst a: number = "x";') },
    { code: src('~~ prettier-ignore\nconst a = 1;') },
    { code: src('~~~ <reference types="node" />\nconst a = 1;') },
    { code: src('const a = ~* #__PURE__ */ make();') },
    { code: src('import(~* webpackChunkName: "x" */ "./x");') },
    { code: src('~~ keep-me: generated\nconst a = 1;'), options: [{ allow: ['^\\s*keep-me:'] }] },
  ],
  invalid: [
    {
      code: src('~~ explains the next line\nconst a = 1;'),
      errors: [
        {
          messageId: 'noComment',
          suggestions: [{ messageId: 'removeComment', output: 'const a = 1;' }],
        },
      ],
    },
    {
      code: src('const a = 1; ~~ trailing'),
      errors: [{ messageId: 'noComment', suggestions: [{ messageId: 'removeComment', output: 'const a = 1;' }] }],
    },
    {
      code: src('~* block\n  comment */\nconst a = 1;'),
      errors: [{ messageId: 'noComment', suggestions: [{ messageId: 'removeComment', output: 'const a = 1;' }] }],
    },
    {
      code: src('function f() {\n  ~~ TODO later\n  return 1;\n}'),
      errors: [{ messageId: 'noComment', suggestions: [{ messageId: 'removeComment', output: 'function f() {\n  return 1;\n}' }] }],
    },
  ],
});

tsTester.run('doc-comment-public-only', rules['doc-comment-public-only'], {
  valid: [
    { code: src('~** Doc. */\nexport function f(): void {}') },
    { code: src('~** Doc. */\nexport default class A {}') },
    { code: src('~** Doc. */\nexport const a = 1;') },
    { code: src('~** Doc. */\nexport type T = string;') },
    { code: src('~** Doc. */\nfunction f(): void {}\nexport { f };') },
    { code: src('~** Doc. */\nconst a = 1;\nexport default a;') },
    { code: src('export class A {\n  ~** Doc. */\n  run(): void {}\n  ~** Doc. */\n  public readonly n = 1;\n}') },
    { code: src('export interface I {\n  ~** Doc. */\n  name: string;\n}') },
    { code: src('export type T = {\n  ~** Doc. */\n  name: string;\n};') },
    { code: src('export const enum E {\n  ~** Doc. */\n  A = "a",\n}') },
    { code: src('export const cfg = {\n  ~** Doc. */\n  a: 1,\n} as const;') },
    { code: src('declare module "x" {\n  ~** Doc. */\n  interface I { a: string }\n}') },
    { code: src('~** @type {number} */\nconst a = 1;') },
  ],
  invalid: [
    { code: src('~** Doc. */\nfunction f(): void {}'), errors: [{ messageId: 'notPublic' }] },
    { code: src('~** Doc. */\nconst a = 1;'), errors: [{ messageId: 'notPublic' }] },
    { code: src('~** Doc. */\ninterface I { a: string }'), errors: [{ messageId: 'notPublic' }] },
    { code: src('~** Doc. */\nimport x from "x";\nexport { x };'), errors: [{ messageId: 'notPublic' }] },
    { code: src('export class A {\n  ~** Doc. */\n  private run(): void {}\n}'), errors: [{ messageId: 'notPublic' }] },
    { code: src('export class A {\n  ~** Doc. */\n  protected n = 1;\n}'), errors: [{ messageId: 'notPublic' }] },
    { code: src('export class A {\n  ~** Doc. */\n  #secret = 1;\n}'), errors: [{ messageId: 'notPublic' }] },
    { code: src('class A {\n  ~** Doc. */\n  run(): void {}\n}'), errors: [{ messageId: 'notPublic' }] },
    { code: src('export function f(): number {\n  ~** Doc. */\n  const a = 1;\n  return a;\n}'), errors: [{ messageId: 'notPublic' }] },
    { code: src('export const a = 1;\n~** Orphan. */'), errors: [{ messageId: 'notPublic' }] },
  ],
});

jsTester.run('doc-comment-public-only (CommonJS)', rules['doc-comment-public-only'], {
  valid: [{ code: src('~** Doc. */\nmodule.exports = {};') }, { code: src('~** Doc. */\nexports.a = 1;') }],
  invalid: [{ code: src('~** Doc. */\nvar a = 1;'), errors: [{ messageId: 'notPublic' }] }],
});

tsTester.run('doc-comment-max-lines', rules['doc-comment-max-lines'], {
  valid: [
    { code: src('~** One line. */\nexport const a = 1;') },
    { code: src('~**\n * Adds.\n * @param a first\n * @returns sum\n */\nexport const add = (a: number) => a;') },
    { code: src('~**\n * A {@link B} ref.\n */\nexport const a = 1;') },
    { code: src('~**\n * One.\n * Two.\n * Three.\n * Four.\n */\nexport const a = 1;'), options: [{ max: 4, summaryMaxLines: 4 }] },
    { code: src('~** Formats a price for display. */\nexport const a = 1;') },
    { code: src('~**\n * Two summary lines.\n * Allowed here.\n */\nexport const a = 1;'), options: [{ summaryMaxLines: 2 }] },
    { code: src('~** @type {import("x").Y} */\nexport const a = 1;') },
  ],
  invalid: [
    {
      code: src('~**\n * One.\n * Two.\n * Three.\n * Four.\n */\nexport const a = 1;'),
      errors: [{ messageId: 'tooLong', data: { actual: '4', max: '3' } }],
    },
    {
      code: src('~**\n * Formats a price.\n * For display in the cart.\n */\nexport const a = 1;'),
      errors: [{ messageId: 'summaryTooLong', data: { actual: '2', max: '1' } }],
    },
    {
      code: src('~**\n * Formats a price.\n * For display.\n * @param a amount\n */\nexport const f = (a: number) => a;'),
      errors: [{ messageId: 'summaryTooLong' }],
    },
    { code: src('~** Flow: A → B */\nexport const a = 1;'), errors: [{ messageId: 'callChain' }] },
    { code: src('~** Loads the cart -> prices it. */\nexport const a = 1;'), errors: [{ messageId: 'callChain' }] },
    { code: src('~** Starts the job.\n * Flow: queue then run */\nexport const a = 1;'), errors: [{ messageId: 'callChain' }] },
    {
      code: src(`~** ${'x'.repeat(121)} */\nexport const a = 1;`),
      errors: [{ messageId: 'lineTooLong', data: { actual: '121', max: '120' } }],
    },
    {
      code: src('~**\n * Adds.\n * @example add(1)\n */\nexport const add = (a: number) => a;'),
      errors: [{ messageId: 'bannedTag' }],
    },
    {
      code: src('~**\n * Old.\n * @deprecated use b\n */\nexport const a = 1;'),
      errors: [{ messageId: 'bannedTag' }],
    },
    {
      code: src('~**\n * Adds.\n * @returns sum\n */\nexport const add = (a: number) => a;'),
      options: [{ bannedTags: ['returns'] }],
      errors: [{ messageId: 'bannedTag' }],
    },
  ],
});

const tsParser = require('@typescript-eslint/parser') as Linter.ParserModule;

function lintWithSharedConfig(code: string): string[] {
  const linter = new Linter({ configType: 'flat' });
  const messages = linter.verify(code, [
    { files: ['**/*.ts'], languageOptions: { parser: tsParser, sourceType: 'module' } },
    { files: ['**/*.ts'], ...commentsConfig },
  ], 'fixture.ts');

  return messages.map((m) => `${m.severity}:${String(m.ruleId)}`);
}

describe('commentsConfig planted violations', () => {
  it('wires the three comment rules at error severity', () => {
    expect(Object.keys(commentsConfig.rules ?? {}).sort()).toEqual(
      COMMENT_RULE_NAMES.map((name) => `@dloizides/${name}`).sort(),
    );
  });

  it('passes clean code with a short public doc comment', () => {
    expect(lintWithSharedConfig(src('~** Public. */\nexport const a = 1;\n'))).toEqual([]);
  });

  it('fails a planted line comment', () => {
    expect(lintWithSharedConfig(src('~~ x\nexport const a = 1;\n'))).toEqual(['2:@dloizides/no-comments']);
  });

  it('fails a planted four-line public doc comment', () => {
    const planted = src('~**\n * One.\n * Two.\n * Three.\n * Four.\n */\nexport const a = 1;\n');
    expect(lintWithSharedConfig(planted)).toEqual(['2:@dloizides/doc-comment-max-lines']);
  });

  it('fails a planted doc comment on a private declaration', () => {
    expect(lintWithSharedConfig(src('~** Hidden. */\nconst a = 1;\nexport const b = a;\n'))).toEqual([
      '2:@dloizides/doc-comment-public-only',
    ]);
  });
});
