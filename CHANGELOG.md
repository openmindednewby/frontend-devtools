# Changelog

All notable changes to `@dloizides/frontend-devtools` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-06-14

### Added

- Initial extraction of the shared RN-web dev tooling duplicated across
  erevna-web, katalogos-web, and kefi-web.
- **ESLint custom rule pack** (17 rules) exported as `plugin` / `rules` /
  `legacyPlugins`, also available under the `@dloizides/frontend-devtools/eslint`
  subpath. Rule names preserved byte-for-byte so existing config keys and
  `eslint-disable-next-line <rule>` comments keep working:
  `enforce-function-style`, `enforce-module-structure`, `enforce-route-preload`,
  `enforce-test-colocation`, `enum-file-isolation`, `i18n-interpolation`,
  `i18n-param-names`, `no-barrel-companion-file`, `no-duplicate-nav-prefix`,
  `no-duplicate-shared-patterns`, `no-generated-models-barrel-value-import`,
  `no-null-check`, `no-optional-undefined`, `no-product-imports-in-shared`,
  `prefer-const-enum`, `require-stable-hook-args`, `smart-max-lines`.
- **`initI18n(options)`** — parameterized i18next + react-i18next init factory.
  Carries the `import/no-named-as-default-member` disable so apps stop repeating
  it. The app owns its `locales/*.json` strings and the active language.
