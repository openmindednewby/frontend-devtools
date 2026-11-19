import tsPlugin from '@typescript-eslint/eslint-plugin';
import * as tsParser from '@typescript-eslint/parser';
import { Linter } from 'eslint';

import type { PluginLike } from './types';

import { MEMBER_ORDER_RULES, memberOrderPlugins } from './memberOrderRules';

function lint(code: string): Linter.LintMessage[] {
  const linter = new Linter({ configType: 'flat' });
  const typescript = tsPlugin as unknown as PluginLike;
  const config = [{
    files: ['**/*.ts'],
    languageOptions: { parser: tsParser as unknown as Linter.ParserModule },
    plugins: { '@typescript-eslint': typescript, ...memberOrderPlugins(typescript) },
    rules: MEMBER_ORDER_RULES,
  }];
  return linter.verify(code, config as unknown as Linter.FlatConfig[], { filename: 'sample.ts' });
}

describe('MEMBER_ORDER_RULES', () => {
  it('with a public method below a private method, reports one error', () => {
    const code = 'class A { private b(): void {} public a(): void {} }';

    const messages = lint(code);

    expect(messages.map((m) => m.ruleId)).toEqual(['@typescript-eslint/member-ordering']);
  });

  it('with an unmarked method below a protected method, reports one error', () => {
    const code = 'class A { protected b(): void {} a(): void {} }';

    const messages = lint(code);

    expect(messages).toHaveLength(1);
  });

  it('with a protected method below a #private method, reports one error', () => {
    const code = 'class A { #b(): void {} protected a(): void {} }';

    const messages = lint(code);

    expect(messages).toHaveLength(1);
  });

  it('with a public field below a #private field, reports one error', () => {
    const code = 'class A { #b = 1; a = 2; }';

    const messages = lint(code);

    expect(messages.map((m) => m.ruleId)).toEqual(['member-order-fields/member-ordering']);
  });

  it('with a public getter below a private setter, reports one error', () => {
    const code = 'class A { private set b(v: number) {} get a(): number { return 1; } }';

    const messages = lint(code);

    expect(messages.map((m) => m.ruleId)).toEqual(['member-order-accessors/member-ordering']);
  });

  it('with private fields above a public constructor and public methods, reports nothing', () => {
    const code = 'class A { private readonly x = 1; #y = 2; constructor() {} static make(): A { return new A(); } run(): void {} }';

    const messages = lint(code);

    expect(messages).toEqual([]);
  });

  it('with public, protected, private and #private methods in order, reports nothing', () => {
    const code = 'class A { a(): void {} protected b(): void {} private c(): void {} #d(): void {} }';

    const messages = lint(code);

    expect(messages).toEqual([]);
  });

  it('with private and #private fields in either order, reports nothing', () => {
    const code = 'class A { #a = 1; private b = 2; }';

    const messages = lint(code);

    expect(messages).toEqual([]);
  });

  it('with interface and type literal members in any order, reports nothing', () => {
    const code = 'interface I { b(): void; a: number; } type T = { b(): void; a: number };';

    const messages = lint(code);

    expect(messages).toEqual([]);
  });
});
