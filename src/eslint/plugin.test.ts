import { plugin, rules, ruleNames } from './plugin';
import { legacyPlugins } from './legacy';

// The exact 17 rule names that lived in the apps' `eslint-plugins/*.mjs`.
// If a rule is dropped or renamed during migration, this list breaks — which is
// the whole point (config keys + `eslint-disable-next-line <name>` must stay
// stable across the extraction).
const EXPECTED_RULE_NAMES = [
  'enforce-function-style',
  'enforce-module-structure',
  'enforce-route-preload',
  'enforce-test-colocation',
  'enum-file-isolation',
  'i18n-interpolation',
  'i18n-param-names',
  'no-barrel-companion-file',
  'no-duplicate-nav-prefix',
  'no-duplicate-shared-patterns',
  'no-generated-models-barrel-value-import',
  'no-null-check',
  'no-optional-undefined',
  'no-product-imports-in-shared',
  'prefer-const-enum',
  'require-stable-hook-args',
  'smart-max-lines',
].sort();

describe('frontend-devtools eslint plugin', () => {
  it('exposes all 17 shared rules', () => {
    expect(ruleNames).toEqual(EXPECTED_RULE_NAMES);
  });

  it('exposes the rule map under plugin.rules and the rules export', () => {
    expect(Object.keys(plugin.rules).sort()).toEqual(EXPECTED_RULE_NAMES);
    expect(rules).toBe(plugin.rules);
  });

  it('carries plugin meta', () => {
    expect(plugin.meta.name).toBe('@dloizides/frontend-devtools');
    expect(typeof plugin.meta.version).toBe('string');
  });

  it('every rule is a valid rule module with create()', () => {
    for (const name of ruleNames)
      expect(typeof rules[name].create).toBe('function');
  });

  it('builds one legacy plugin per rule, keyed by rule name', () => {
    expect(Object.keys(legacyPlugins).sort()).toEqual(EXPECTED_RULE_NAMES);
  });

  it('each legacy plugin holds exactly its own rule under <name>/<name>', () => {
    for (const name of ruleNames) {
      const legacy = legacyPlugins[name];
      expect(Object.keys(legacy.rules)).toEqual([name]);
      // The same rule object the merged plugin exposes (no copy/drift).
      expect(legacy.rules[name]).toBe(rules[name]);
    }
  });
});
