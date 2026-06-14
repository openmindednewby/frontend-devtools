/**
 * `@dloizides/frontend-devtools/eslint` — the shared custom ESLint rule pack.
 *
 * The 17 rule implementations are owned here (they were previously duplicated
 * byte-for-byte in erevna-web and katalogos-web `eslint-plugins/*.mjs`). The app
 * owns WHICH rules it enables and their options + severities; the package owns
 * the rule logic.
 */
export { plugin, rules, ruleNames } from './plugin';
export { legacyPlugins } from './legacy';
export type {
  CustomRule,
  FlatConfigPlugin,
  FlatConfig,
  SingleRulePlugin,
} from './types';
