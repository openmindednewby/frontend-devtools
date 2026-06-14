/**
 * `@dloizides/frontend-devtools` — shared RN-web dev tooling for the
 * dloizides.com SaaS frontends.
 *
 * Two product-agnostic, byte-for-byte-duplicated concerns extracted from
 * erevna-web / katalogos-web / kefi-web:
 *
 *   1. The custom ESLint rule pack (17 rules) — also available under the
 *      `@dloizides/frontend-devtools/eslint` subpath. The app decides which
 *      rules to enable + their options; the package owns the rule logic.
 *
 *   2. `initI18n(options)` — the parameterized i18next + react-i18next init
 *      factory. The app owns its `locales/*.json` strings and the active
 *      language; the package owns the `.use().init()` chain (incl. the
 *      `import/no-named-as-default-member` disable that every app repeated).
 *
 * Never imports a product.
 */

// i18n init factory
export { initI18n } from './i18n/initI18n';
export type { InitI18nOptions } from './i18n/initI18n';

// ESLint custom rule pack (also at the `/eslint` subpath)
export { plugin, rules, ruleNames, legacyPlugins } from './eslint';
export type {
  CustomRule,
  FlatConfigPlugin,
  FlatConfig,
  SingleRulePlugin,
} from './eslint';
