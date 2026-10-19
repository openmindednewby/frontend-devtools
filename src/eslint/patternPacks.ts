import tanstackQueryPlugin from '@tanstack/eslint-plugin-query';
import boundariesPlugin from 'eslint-plugin-boundaries';
import effectPlugin from 'eslint-plugin-react-you-might-not-need-an-effect';
import sonarjsPlugin from 'eslint-plugin-sonarjs';

import type { FlatConfig } from './types';

import { plugin } from './plugin';

type PluginObject = NonNullable<FlatConfig['plugins']>[string];
type RuleEntries = NonNullable<FlatConfig['rules']>;
type RuleEntry = RuleEntries[string];

interface PackModule {
  default?: unknown;
  rules?: unknown;
  configs?: Record<string, unknown>;
}

const OFF_LEVELS: readonly unknown[] = ['off', 0];

function pluginOf(mod: unknown): PluginObject & PackModule {
  const candidate = mod as PackModule;
  const inner = candidate.default as PackModule | undefined;
  return (inner?.rules !== undefined ? inner : candidate) as PluginObject & PackModule;
}

function rulesOf(config: unknown): RuleEntries {
  const blocks: readonly { rules?: RuleEntries }[] = Array.isArray(config) ? config : [config ?? {}];
  return Object.assign({}, ...blocks.map((block) => block.rules ?? {})) as RuleEntries;
}

function toWarn(entry: RuleEntry): RuleEntry {
  const level: unknown = Array.isArray(entry) ? entry[0] : entry;
  if (OFF_LEVELS.includes(level)) {return entry;}
  return (Array.isArray(entry) ? ['warn', ...(entry as unknown[]).slice(1)] : 'warn') as RuleEntry;
}

function warnAll(rules: RuleEntries): RuleEntries {
  return Object.fromEntries(Object.entries(rules).map(([name, entry]) => [name, toWarn(entry)]));
}

const tanstackQuery = pluginOf(tanstackQueryPlugin);
const effect = pluginOf(effectPlugin);
const boundaries = pluginOf(boundariesPlugin);
const sonarjs = pluginOf(sonarjsPlugin);

export const HOUSE_PATTERN_RULE_NAMES: readonly string[] = ['query-key-factory'];

/** D-PAT-12 preset: four community rule packs plus the house pattern rules, every rule at warn. */
export const patternPacksConfig: FlatConfig = {
  plugins: {
    '@tanstack/query': tanstackQuery,
    'react-you-might-not-need-an-effect': effect,
    boundaries,
    sonarjs,
    '@dloizides': plugin as unknown as PluginObject,
  },
  rules: warnAll({
    ...rulesOf(tanstackQuery.configs?.['flat/recommended']),
    ...rulesOf(effect.configs?.recommended),
    ...rulesOf(boundaries.configs?.recommended),
    ...rulesOf(sonarjs.configs?.recommended),
    '@dloizides/query-key-factory': 'warn',
  }),
};
