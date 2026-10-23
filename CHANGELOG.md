# Changelog

All notable changes to `@dloizides/frontend-devtools` are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2026-10-23

FOCUS-1 "Every screen names its initial focus", D-FOCUS-2 "Lint rule and ledger".

### Added
- `explicit-initial-focus`: flags a file that builds a menu of 2+ buttons (HTML strings or `createElement('button')`) with no `MENU_DEFAULT_ATTR` / `data-menu-default` / `dataset.menuDefault` / `initialFocus`, and a JSX `*Dialog` / `*Modal` / `role="dialog"` in a file with no `autoFocus`, `initialFocus(Ref)` or `.focus()` call. Options: `minControls`, `dialogPattern`, `selfFocusing`.
- `focusConfig` + `FOCUS_RULE_NAMES` (opt-in, not part of `recommendedConfig` or `gameConfig`).

## [2.1.0] - 2026-10-20

QUAL-ADOPT-1 "Fail lint/arch tests when an app re-implements an existing package" (TS half).

### Added
- `no-reimplemented-package`: flags app code that re-implements a shared package (hand-rolled analytics/Umami -> `@dloizides/analytics-web`, `X-BFF-Csrf` header or `bffCsrf` -> `@dloizides/bff-web-client`, `forgotPasswordRequest` -> `@dloizides/auth-web`, `utils/logger` -> `@dloizides/logging-web`). Pairs live in one registry, `src/rules/reimplemented-packages-registry.js`. Tests, e2e and package sources are exempt; `allow` adds path fragments.
- `reuseConfig` + `REUSE_RULE_NAMES` (opt-in, not part of `recommendedConfig`).

## [2.0.0] - 2026-10-20

D-PAT-15 "Move initI18n out of frontend-devtools so it is dev-only".

### Removed (BREAKING)
- `initI18n` and `InitI18nOptions`: import them from `@dloizides/i18n` (>= 1.1.0), same signature: `import { initI18n } from '@dloizides/i18n';`.
- The root entry (`@dloizides/frontend-devtools`): it exported only `initI18n`. Use the `/eslint` and `/test-results` subpaths.
- The `i18next` and `react-i18next` optional peer dependencies.

## [1.10.0] - 2026-10-19

PATTERN-1.12 "TS rule packs + house rules in frontend-devtools" (D-PAT-12 "Whole rule packs as warnings, one shared approach").

### Added
- `patternPacksConfig`: the recommended rules of `@tanstack/eslint-plugin-query`, `eslint-plugin-react-you-might-not-need-an-effect`, `eslint-plugin-boundaries` and `eslint-plugin-sonarjs`, every rule at `warn`, plus the house rules.
- `query-key-factory` (PAT-QUERY-KEY-1 "queryKey only from a key factory"): flags an inline array/string/template `queryKey`; key-factory files (`*Keys.ts`), tests and generated code are exempt; `allow` adds path fragments.
- `HOUSE_PATTERN_RULE_NAMES`.

## [1.9.0] - 2026-10-19

PATTERN-1.4 "TypeScript pattern rules as ESLint rules", `no-raw-backend-fetch` (PAT-API-1 "web apps call the backend through the shared client") hardening.

### Changed
- `no-raw-backend-fetch` no longer reports `fetch` of a literal absolute `http(s)://host/...` URL (third-party), or of a value produced by `URL.createObjectURL(...)` / `new FileReader().result` (direct, or via a single `const`).
- `no-raw-backend-fetch` registers no visitors when the parsed AST is not an ESTree `Program` (non-JS languages under an unscoped `apiConfig`).

### Tests
- `apiConfigUnscoped.test.ts`: `apiConfig` without `files` lints `.js`/`.mjs`/`.cjs`, build output and a 2000-deep nested file without throwing, and still reports under `src/`.

## [1.8.0] - 2026-10-19

PATTERN-1.4 "TypeScript pattern rules as ESLint rules", row PAT-API-1 "web apps call the backend through the shared client".

### Added

- `no-raw-backend-fetch`: reports `fetch(` / `window.fetch(` / `globalThis.fetch(` / `self.fetch(` and value imports of `axios`
  (`import`, `require`, `import()`) in `src/**`. Exempt: `src/server/`, `src/http/`, `src/lib/http/`, `packages/*-client/`,
  `/generated/`, service worker files, `app/+html.*`, tests, `data:`/`blob:` URLs, `import type` from axios. Option `{ allow: string[] }`.
- `apiConfig` flat-config preset (`API_RULE_NAMES`) at `error`; included in `recommendedConfig`.

## [1.7.0] - 2026-10-19

NAV-1 "Every game menu works with arrow keys and controller", phase 3.

### Added

- `game-menu-focusable`: reports a `click` / `pointerdown` / `pointerup` listener or `onclick =` on an element created as
  `div` / `span` / `li` / `img` whose variable never gets `tabIndex` / `role` (property or `setAttribute`), and every
  `stopPropagation()` inside a `keydown` / `onkeydown` handler (inline, named function or const). No options, no autofix.
- `gameConfig` flat-config preset (`GAME_RULE_NAMES`): enables `game-menu-focusable` at `error`. Not part of
  `recommendedConfig`; game repos opt in.

### Changed

- `testdoc-results.v1.schema.json` copy synced to Dloizides.Testing 7fbf809 (adds the optional `features` array).

## [1.5.0] - 2026-10-07

KEFI-ACT-1 "Same attendee actions everywhere" (generalized: one row-action source per entity, every portal).

### Added

- `single-row-action-source`: reports `<RowActionGroup actions>` from `@dloizides/ui-buttons` built in the same file
  (inline array, array-bound identifier, `useMemo` returning an array, local builder function, `RowActionSpec[]`
  annotated local). Imported builders/sets and props pass. No options, no autofix.
- `rowActionsConfig` and `recommendedConfig` flat-config blocks (`recommendedConfig` = comments + row actions, all `error`).

## [1.4.0] - 2026-10-07

COMMENTS-1 "No code comments; only short doc comments on public members", decision D-CMT-4 "One-line summary, no call chains".

### Changed

- `doc-comment-max-lines`: the description (lines other than `@param` / `@returns`) is capped at ONE line
  (`summaryMaxLines`, default 1), every doc line at 120 chars (`lineMaxChars`), and a line containing an arrow
  (U+2192 or `->`) or starting `Flow:` is reported (`callChain`). Matches `.claude/hooks/review-violations.js` docBlock().
  The 3-line total cap is unchanged. One report per block; banned tags take precedence.

## [1.3.0] - 2026-10-06

COMMENTS-1 "No code comments; only short doc comments on public members" (decisions D-CMT-1, D-CMT-3).

### Added

- `no-comments`: reports every comment that is not a `/**` doc block and not a tool directive
  (`eslint-*`, `@ts-*`, `prettier-ignore`, `istanbul`/`c8`, `/// <reference>`, `#__PURE__`,
  `webpackChunkName`, shebang). `allow: string[]` adds directive regexes. Suggestion only, no autofix.
- `doc-comment-public-only`: a doc block must sit on an exported declaration (incl. `export { x }`,
  `export default x`, `module.exports`, ambient `declare module`) or a public member of one;
  `private` / `protected` / `#` members and local declarations are reported.
- `doc-comment-max-lines`: doc body capped at `max` (default 3) content lines; block tags other than
  `allowedTags` (default `@param`, `@returns`) are reported. JSDoc type-annotation blocks
  (`@type`, `@typedef`, ...) are exempt from both doc rules.
- `commentsConfig` flat-config block (the three rules at `error`) and `COMMENT_RULE_NAMES`, exported
  from `/eslint`. Not adopted by any app yet: each repo opts in as step 1 of its COMMENTS-CLEAN sweep.

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
