import type { CustomRule, FlatConfigPlugin } from './types';

import { rules } from './plugin';

/**
 * The apps historically registered each custom rule under a namespace EQUAL to
 * its rule name, e.g. `plugins: { 'no-null-check': plugin }` with the rule keyed
 * as `'no-null-check/no-null-check'`. Inline `eslint-disable-next-line
 * no-null-check/no-null-check` comments and config keys depend on that exact
 * `<name>/<name>` shape.
 *
 * To migrate WITHOUT changing a single config key or disable comment, the app
 * spreads {@link legacyPlugins} into its flat config's `plugins` map. Each rule
 * name maps to a one-rule plugin object holding that rule — reproducing the old
 * `import xPlugin from './eslint-plugins/x.mjs'` registration byte-for-byte.
 *
 * ```js
 * import { legacyPlugins } from '@dloizides/frontend-devtools/eslint';
 * export default [{
 *   plugins: { ...legacyPlugins },
 *   rules: {
 *     'no-null-check/no-null-check': 'error', // unchanged
 *     'smart-max-lines/smart-max-lines': ['error', { functionMax: 50 }],
 *   },
 * }];
 * ```
 */
export const legacyPlugins: Record<string, FlatConfigPlugin> = buildLegacyPlugins();

function buildLegacyPlugins(): Record<string, FlatConfigPlugin> {
  const out: Record<string, FlatConfigPlugin> = {};
  for (const [name, rule] of Object.entries(rules)) {
    out[name] = oneRulePlugin(name, rule);
  }

  return out;
}

function oneRulePlugin(name: string, rule: CustomRule): FlatConfigPlugin {
  return {
    meta: { name, version: '1.0.0' },
    rules: { [name]: rule },
  };
}
