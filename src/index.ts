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

// i18n init factory — the ONLY thing the main entry exports, so importing this
// package at runtime (apps do `import { initI18n } from '@dloizides/frontend-devtools'`)
// stays React-Native-safe. The ESLint rule pack lives under the `./eslint` subpath
// ONLY: its rule files import Node's `fs`/`path`, which break Metro's native bundle
// when pulled in transitively. (Re-exporting eslint here previously crashed
// `eas build` for Android at the JS-bundle phase — Platform P4.)
export { initI18n } from './i18n/initI18n';
export type { InitI18nOptions } from './i18n/initI18n';
