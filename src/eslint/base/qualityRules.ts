import type { Linter } from 'eslint';

const ERROR_RULE_NAMES = [
  'no-debugger', 'no-alert', 'no-eval', 'no-implied-eval', 'no-new-func', 'no-script-url', 'no-void',
  'no-with', 'no-proto', 'no-extend-native', 'no-iterator', 'no-labels', 'no-lone-blocks', 'no-multi-str',
  'no-new-wrappers', 'no-octal-escape', 'no-self-compare', 'no-sequences', 'no-throw-literal',
  'no-unmodified-loop-condition', 'no-unused-expressions', 'no-useless-call', 'no-useless-concat',
  'no-useless-return', 'prefer-promise-reject-errors', 'radix', 'yoda',
];

const ERROR_RULE_NAMES_AFTER_CURLY = [
  'default-case', 'default-case-last', 'grouped-accessor-pairs', 'no-constructor-return', 'no-else-return',
];

const ERROR_RULE_NAMES_AFTER_EMPTY_FUNCTION = [
  'no-extra-bind', 'no-floating-decimal', 'no-implicit-coercion', 'no-multi-spaces',
];

const ERROR_RULE_NAMES_AFTER_PARAM_REASSIGN = [
  'no-return-assign', 'prefer-const', 'prefer-template', 'object-shorthand', 'no-var', 'no-nested-ternary',
  'no-unneeded-ternary',
];

const TOO_MANY_CONDITIONS = 'Condition has more than 2 expressions. Extract to a named variable (e.g., const shouldUpdate = a && b && c)';
const TOO_MANY_TERNARY_CONDITIONS = 'Ternary condition has more than 2 expressions. Extract to a named variable';
const TOO_MANY_WHILE_CONDITIONS = 'While condition has more than 2 expressions. Extract to a named variable';

function asErrors(names: readonly string[]): Linter.RulesRecord {
  return Object.fromEntries(names.map((name) => [name, 'error']));
}

function nestedLogical(parent: string, message: string): Array<{ selector: string; message: string }> {
  return ['left', 'right'].map((side) => ({
    selector: `${parent} > LogicalExpression[${side}.type="LogicalExpression"]`,
    message,
  }));
}

export const QUALITY_RULES: Linter.RulesRecord = {
  'no-console': ['error', { allow: ['warn', 'error'] }],
  ...asErrors(ERROR_RULE_NAMES),
  'eqeqeq': ['error', 'always'],
  'curly': ['error', 'multi'],
  ...asErrors(ERROR_RULE_NAMES_AFTER_CURLY),
  'no-empty-function': ['error', { allow: ['arrowFunctions'] }],
  ...asErrors(ERROR_RULE_NAMES_AFTER_EMPTY_FUNCTION),
  'no-param-reassign': ['error', { props: true }],
  ...asErrors(ERROR_RULE_NAMES_AFTER_PARAM_REASSIGN),
  'spaced-comment': ['error', 'always'],
  'max-depth': ['error', 4],
  'max-nested-callbacks': ['error', 3],
  'max-params': ['error', 4],
  'complexity': ['warn', 15],
  'no-magic-numbers': ['error', {
    ignore: [0, 1, -1, 2, 100],
    ignoreArrayIndexes: true,
    ignoreDefaultValues: true,
    enforceConst: true,
    ignoreClassFieldInitialValues: true,
    ignoreEnums: true,
  }],
  'no-restricted-syntax': [
    'error',
    {
      selector: 'TSEnumDeclaration:not([const])',
      message: 'Use const enum instead of enum. String literal union types should also use const enum.',
    },
    ...nestedLogical('IfStatement', TOO_MANY_CONDITIONS),
    ...nestedLogical('ConditionalExpression', TOO_MANY_TERNARY_CONDITIONS),
    ...nestedLogical('WhileStatement', TOO_MANY_WHILE_CONDITIONS),
  ],
};
