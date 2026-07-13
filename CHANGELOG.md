# Changelog

All notable changes to `@dloizides/frontend-devtools` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-13

Both changes come out of the ES-04 (agora-web) build, which surfaced two ways the
rule pack misbehaved against a freshly scaffolded app.

### Fixed

- **`no-null-check`: the autofixer no longer corrupts files.** It rewrote
  `x === undefined` → `!isValueDefined(x)` *without importing `isValueDefined`*,
  so `eslint --fix` emitted source referencing an undeclared global. Running
  `lint:fix` on agora-web rewrote ~20 files and produced 67 `no-unsafe-call` /
  `strict-boolean-expressions` errors. A fixer that produces broken code is worse
  than no fixer — `lint:fix` is the first thing anyone runs.

  The fixer now inserts `import { isValueDefined } from '@dloizides/utils';` (the
  path is configurable via the pre-existing but previously **unused**
  `utilImportPath` option) when the file has no binding for the guard, and skips
  the autofix entirely in the module that defines or re-exports it. Proven with
  `Linter.verifyAndFix` multipass tests — the actual `--fix` code path.

  ⚠️ The package's own test suite had *codified* the bug: it asserted the
  import-less output was correct. Those expectations were wrong and are updated.

### Changed

- **`smart-max-lines`: `functionWarn` is now opt-in (default: off).** ESLint has
  no per-report severity, so a `functionWarn` report is emitted at the severity
  the *rule* is configured with. Every app configured the rule as `'error'` and
  passed `functionWarn: 30` — which made the real, enforced limit **30 lines**
  while the docs promised **50**. The rule lied about its own threshold.

  Out of the box the only enforced thresholds are now `componentMax` (200) and
  `functionMax` (50) — exactly what the documentation has always promised.
  `functionWarn` remains available as an explicit *stricter second threshold*,
  and its schema/message now say plainly that it reports at the rule's severity
  rather than as a warning.

  Migration: drop `functionWarn: 30` from your ESLint config. This only relaxes
  linting (30 → 50), so it cannot introduce new failures.

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
