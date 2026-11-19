import type { Linter } from 'eslint';

const JSX_ALLOWED_STRINGS = [
  '/', '-', '>', '<', '|', ':', '.', ',', '+', '=', '(', ')',
  '*', '%', '$', '#', '&', '@', '~', '^', '!', '?', ';',
  '→', '✕',
];

const A11Y_RULE_NAMES = [
  'has-accessibility-hint', 'has-accessibility-props', 'has-valid-accessibility-actions',
  'has-valid-accessibility-role', 'has-valid-accessibility-state', 'has-valid-accessibility-states',
  'has-valid-accessibility-component-type', 'has-valid-accessibility-traits',
  'has-valid-accessibility-value', 'no-nested-touchables', 'has-valid-accessibility-descriptors',
  'has-valid-accessibility-ignores-invert-colors', 'has-valid-accessibility-live-region',
  'has-valid-important-for-accessibility',
];

export const REACT_RULES: Linter.RulesRecord = {
  'react/jsx-uses-react': 'off',
  'react/react-in-jsx-scope': 'off',
  'react/prop-types': 'off',
  'react/display-name': 'error',
  'react/jsx-key': ['error', { checkFragmentShorthand: true, checkKeyMustBeforeSpread: true }],
  'react/jsx-no-duplicate-props': 'error',
  'react/jsx-no-undef': 'error',
  'react/jsx-pascal-case': 'error',
  'react/jsx-uses-vars': 'error',
  'react/no-children-prop': 'error',
  'react/no-danger-with-children': 'error',
  'react/no-deprecated': 'error',
  'react/no-direct-mutation-state': 'error',
  'react/no-find-dom-node': 'error',
  'react/no-is-mounted': 'error',
  'react/no-render-return-value': 'error',
  'react/no-string-refs': 'error',
  'react/no-unescaped-entities': 'error',
  'react/no-unknown-property': 'error',
  'react/no-unsafe': ['error', { checkAliases: true }],
  'react/self-closing-comp': 'error',
  'react/jsx-boolean-value': ['error', 'never'],
  'react/jsx-curly-brace-presence': ['error', { props: 'never', children: 'never' }],
  'react/jsx-fragments': ['error', 'syntax'],
  'react/jsx-no-useless-fragment': 'error',
  'react/jsx-sort-props': ['error', {
    callbacksLast: true,
    shorthandFirst: true,
    ignoreCase: true,
    reservedFirst: true,
  }],
  'react/function-component-definition': ['error', {
    namedComponents: 'arrow-function',
    unnamedComponents: 'arrow-function',
  }],
  'react/hook-use-state': 'error',
  'react/no-unstable-nested-components': ['error', { allowAsProps: true }],
  'react/no-array-index-key': 'error',
  'react/jsx-no-leaked-render': 'error',
  'react/jsx-no-literals': ['error', {
    noStrings: true,
    allowedStrings: JSX_ALLOWED_STRINGS,
    ignoreProps: true,
    noAttributeStrings: false,
  }],
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'error',
  'react-compiler/react-compiler': 'warn',
};

/** The stable-hook-args rule; hooks matching a pattern (e.g. generated query hooks) are skipped. */
export function stableHookArgsRule(ignoreHookPatterns: readonly string[]): Linter.RulesRecord {
  return {
    'require-stable-hook-args/require-stable-hook-args': ['warn', { ignoreHookPatterns: [...ignoreHookPatterns] }],
  };
}

export const REACT_NATIVE_RULES: Linter.RulesRecord = {
  'react-native/no-unused-styles': 'error',
  'react-native/split-platform-components': 'error',
  'react-native/no-inline-styles': 'error',
  'react-native/no-color-literals': 'error',
  'react-native/no-raw-text': ['error', { skip: ['Text', 'Button'] }],
  'react-native/no-single-element-style-arrays': 'error',
  ...Object.fromEntries(A11Y_RULE_NAMES.map((name) => [`react-native-a11y/${name}`, 'error'])),
};
