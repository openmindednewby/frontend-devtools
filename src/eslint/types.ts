import type { Rule, Linter } from 'eslint';

/**
 * A single custom ESLint rule implementation (the object passed to ESLint's
 * `RuleTester`). The rule `.mjs` files export `{ rules: { '<name>': rule } }`.
 */
export type CustomRule = Rule.RuleModule;

/**
 * The shape each rule `.mjs` module default-exports: a one-rule plugin object.
 */
export interface SingleRulePlugin {
  rules: Record<string, CustomRule>;
}

/**
 * An ESLint flat-config plugin object: a name + the merged rule map.
 */
export interface FlatConfigPlugin {
  meta: { name: string; version: string };
  rules: Record<string, CustomRule>;
}

/**
 * A flat-config block (the entries of an `eslint.config.mjs` array).
 */
export type FlatConfig = Linter.FlatConfig;
