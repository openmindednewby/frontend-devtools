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
export { HOUSE_PATTERN_RULE_NAMES, patternPacksConfig } from './patternPacks';
export {
  API_RULE_NAMES,
  COMMENT_RULE_NAMES,
  GAME_RULE_NAMES,
  REUSE_RULE_NAMES,
  ROW_ACTION_RULE_NAMES,
  apiConfig,
  commentsConfig,
  gameConfig,
  recommendedConfig,
  reuseConfig,
  rowActionsConfig,
} from './configs';
export type {
  CustomRule,
  FlatConfigPlugin,
  FlatConfig,
  SingleRulePlugin,
} from './types';
