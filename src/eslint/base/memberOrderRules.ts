import type { Linter } from 'eslint';

import type { PluginLike } from './types';

const FIELDS_PLUGIN = 'member-order-fields';
const ACCESSORS_PLUGIN = 'member-order-accessors';

function accessOrder(kinds: string[]): Linter.RuleEntry {
  const ranks = [['public'], ['protected'], ['private', '#private']];
  const memberTypes = ranks.map((rank) => rank.flatMap((access) => kinds.map((kind) => `${access}-${kind}`)));
  return ['error', { default: { memberTypes, order: 'as-written' } }];
}

/** MEMBER-ORDER-1: per member kind, public above protected above private and #private. */
export const MEMBER_ORDER_RULES: Linter.RulesRecord = {
  '@typescript-eslint/member-ordering': accessOrder(['method']),
  [`${FIELDS_PLUGIN}/member-ordering`]: accessOrder(['field', 'accessor']),
  [`${ACCESSORS_PLUGIN}/member-ordering`]: accessOrder(['get', 'set']),
};

/** Registers the typescript-eslint plugin under the extra names that run member-ordering once per member kind. */
export function memberOrderPlugins(typescript: PluginLike): Record<string, PluginLike> {
  return { [FIELDS_PLUGIN]: typescript, [ACCESSORS_PLUGIN]: typescript };
}
