import type { Linter } from 'eslint';

import { MEMBER_ORDER_RULES } from '../eslint/base/memberOrderRules';

const MAX_FILE_LINES = 300;

/** The rules the count gate owns: FILE-SIZE-1 raw max-lines plus MEMBER-ORDER-1 per member kind. */
export const GATED_RULES: Linter.RulesRecord = {
  'max-lines': ['error', { max: MAX_FILE_LINES, skipBlankLines: false, skipComments: false }],
  ...MEMBER_ORDER_RULES,
};
