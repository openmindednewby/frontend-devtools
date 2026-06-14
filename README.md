# @dloizides/frontend-devtools

Shared **RN-web dev tooling** for the dloizides.com SaaS frontends. Extracts two
product-agnostic concerns that were duplicated byte-for-byte across
`erevna-web`, `katalogos-web`, and `kefi-web`:

1. The **custom ESLint rule pack** (17 rules) — previously 17 identical
   `eslint-plugins/*.mjs` files in each app.
2. **`initI18n()`** — the parameterized i18next + react-i18next init factory —
   previously an identical `src/localization/i18n.ts` in each app.

> **Decoupling:** the package owns the *logic* (rule implementations + the
> i18next `.use().init()` chain). Each app owns its *config* — which rules it
> enables and with what options, plus its own `locales/*.json` strings.
> This package **never imports a product**.

## Install

```sh
npm install -D @dloizides/frontend-devtools
```

`eslint`, `i18next`, and `react-i18next` are optional peer dependencies — apps
that only use one half don't need the other's peers.

## ESLint rule pack

Import from the root or the `/eslint` subpath. Three shapes are exported:

| Export | Use when |
| --- | --- |
| `plugin` | You want one namespaced plugin, e.g. `'@dloizides/no-null-check'`. |
| `rules` | You want the raw `Record<name, rule>` map. |
| `legacyPlugins` | **Migration:** keep the exact `<name>/<name>` keys the apps already use. |

### Migrating the apps (zero config-key churn)

The apps registered each rule under a namespace equal to its name
(`'no-null-check/no-null-check'`, `'smart-max-lines/smart-max-lines'`, …), and
inline `eslint-disable-next-line no-null-check/no-null-check` comments depend on
that. Spread `legacyPlugins` to preserve every key:

```js
// eslint.config.mjs
import { legacyPlugins } from '@dloizides/frontend-devtools/eslint';

export default [
  {
    files: ['**/*.ts', '**/*.tsx'],
    plugins: { ...legacyPlugins },
    rules: {
      'no-null-check/no-null-check': 'error',
      'smart-max-lines/smart-max-lines': ['error', { functionMax: 50 }],
      // ...existing keys unchanged
    },
  },
];
```

Delete the local `eslint-plugins/*.mjs` files and their imports; the rule names,
options, and severities stay exactly as they were.

### Namespaced plugin (alternative)

```js
import { plugin as devtools } from '@dloizides/frontend-devtools/eslint';

export default [
  {
    plugins: { '@dloizides': devtools },
    rules: { '@dloizides/no-null-check': 'error' },
  },
];
```

### Rules

`enforce-function-style`, `enforce-module-structure`, `enforce-route-preload`,
`enforce-test-colocation`, `enum-file-isolation`, `i18n-interpolation`,
`i18n-param-names`, `no-barrel-companion-file`, `no-duplicate-nav-prefix`,
`no-duplicate-shared-patterns`, `no-generated-models-barrel-value-import`,
`no-null-check`, `no-optional-undefined`, `no-product-imports-in-shared`,
`prefer-const-enum`, `require-stable-hook-args`, `smart-max-lines`.

`ruleNames` exports the sorted list for migration assertions (prove no rule was
dropped).

## i18n init factory

```ts
// src/localization/i18n.ts
import { initI18n } from '@dloizides/frontend-devtools';
import * as Localization from 'expo-localization';
import en from './locales/en.json';

const i18n = initI18n({
  resources: { en: { translation: en } },
  lng: Localization.getLocales()[0]?.languageCode, // optional; defaults to fallback
});

export default i18n;
```

### `InitI18nOptions`

| Field | Type | Default | Notes |
| --- | --- | --- | --- |
| `resources` | `Resource` | — (required) | App-owned strings bundle. |
| `lng` | `string` | `fallbackLng` | Active language. |
| `fallbackLng` | `string` | `'en'` | Fallback for missing keys. |
| `escapeValue` | `boolean` | `false` | React already escapes output. |
| `defaultNS` | `string \| string[]` | i18next default | Optional. |
| `ns` | `string \| string[]` | — | Optional; for multi-namespace apps. |

The factory wires `react-i18next` into the i18next singleton, runs `.init()`,
swallows the (synchronous-for-in-memory) init rejection, and returns the
singleton. The `FM()` / `FD()` helpers + `locales/*.json` stay **app-owned**
(per the SaaS code standards).

## Scripts

| Script | What |
| --- | --- |
| `npm run build` | Bundle with tsup (CJS + ESM + d.ts). |
| `npm test` | Jest (rule behaviour via `RuleTester` + i18n init). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint over `src`. |

## License

MIT © dloizides
