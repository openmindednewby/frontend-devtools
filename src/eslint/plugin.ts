import type { CustomRule, FlatConfigPlugin, SingleRulePlugin } from './types';

// The 17 shared custom rules (byte-for-byte the rule logic that lived in
// erevna-web / katalogos-web `eslint-plugins/*.mjs`). Each module
// default-exports `{ rules: { '<name>': rule } }`.
import enforceFunctionStyle from '../rules/enforce-function-style.js';
import enforceModuleStructure from '../rules/enforce-module-structure.js';
import enforceRoutePreload from '../rules/enforce-route-preload.js';
import enforceTestColocation from '../rules/enforce-test-colocation.js';
import enumFileIsolation from '../rules/enum-file-isolation.js';
import i18nInterpolation from '../rules/i18n-interpolation.js';
import i18nParamNames from '../rules/i18n-param-names.js';
import noBarrelCompanionFile from '../rules/no-barrel-companion-file.js';
import noDuplicateNavPrefix from '../rules/no-duplicate-nav-prefix.js';
import noDuplicateSharedPatterns from '../rules/no-duplicate-shared-patterns.js';
import noGeneratedModelsBarrelValueImport from '../rules/no-generated-models-barrel-value-import.js';
import noNullCheck from '../rules/no-null-check.js';
import noOptionalUndefined from '../rules/no-optional-undefined.js';
import noProductImportsInShared from '../rules/no-product-imports-in-shared.js';
import noRawColorLiteral from '../rules/no-raw-color-literal.js';
import preferConstEnum from '../rules/prefer-const-enum.js';
import requireStableHookArgs from '../rules/require-stable-hook-args.js';
import smartMaxLines from '../rules/smart-max-lines.js';

// Package version — kept in sync with package.json by the publish flow.
const PLUGIN_VERSION = '1.0.0';

const ruleModules: readonly SingleRulePlugin[] = [
  enforceFunctionStyle,
  enforceModuleStructure,
  enforceRoutePreload,
  enforceTestColocation,
  enumFileIsolation,
  i18nInterpolation,
  i18nParamNames,
  noBarrelCompanionFile,
  noDuplicateNavPrefix,
  noDuplicateSharedPatterns,
  noGeneratedModelsBarrelValueImport,
  noNullCheck,
  noOptionalUndefined,
  noProductImportsInShared,
  noRawColorLiteral,
  preferConstEnum,
  requireStableHookArgs,
  smartMaxLines,
];

function mergeRules(modules: readonly SingleRulePlugin[]): Record<string, CustomRule> {
  const merged: Record<string, CustomRule> = {};
  for (const mod of modules) {
    for (const [name, rule] of Object.entries(mod.rules)) {
      if (merged[name] !== undefined) {
        throw new Error(`Duplicate ESLint rule name: "${name}"`);
      }
      merged[name] = rule;
    }
  }

  return merged;
}

/**
 * The flat-config plugin object. Register it under a namespace in the app's
 * `eslint.config.mjs`:
 *
 * ```js
 * import { plugin as devtools } from '@dloizides/frontend-devtools/eslint';
 * export default [{ plugins: { '@dloizides': devtools }, rules: {
 *   '@dloizides/no-null-check': 'error',
 * } }];
 * ```
 */
export const plugin: FlatConfigPlugin = {
  meta: { name: '@dloizides/frontend-devtools', version: PLUGIN_VERSION },
  rules: mergeRules(ruleModules),
};

/**
 * The merged rule map alone (the same `Record<name, rule>` that the apps used to
 * spread from 17 separate `eslint-plugins/*.mjs` files).
 */
export const rules: Record<string, CustomRule> = plugin.rules;

/**
 * The list of rule names this plugin provides. Useful for migration assertions
 * (prove no rule was dropped vs. the old 17 local files).
 */
export const ruleNames: readonly string[] = Object.keys(plugin.rules).sort();
