import type { Linter } from 'eslint';

export const I18N_LITERAL_STRING_RULES: Linter.RulesRecord = {
  'i18next/no-literal-string': ['error', {
    markupOnly: true,
    ignoreAttribute: [
      'className', 'style', 'id', 'key', 'ref', 'type', 'name', 'value',
      'defaultValue', 'href', 'src', 'as', 'to', 'from',
      'mode', 'variant', 'size', 'color',
      'testID',
      'accessibilityRole', 'accessibilityState',
      'aria-hidden', 'aria-live', 'aria-current', 'aria-expanded',
      'aria-selected', 'aria-checked',
      'd', 'viewBox', 'fill', 'stroke', 'strokeWidth',
      'strokeLinecap', 'strokeLinejoin', 'xmlns',
      'role', 'tabIndex', 'htmlFor', 'autoComplete', 'autoFocus',
      'autoCapitalize', 'keyboardType', 'returnKeyType',
      'secureTextEntry', 'multiline', 'numberOfLines',
      'resizeMode', 'contentFit', 'pointerEvents',
    ],
    ignoreCallee: [
      'require', 'Error', 'URL', 'console.*', 'cn',
      'navigate', 'useRoute', 'useNavigation',
      'StyleSheet.create', 'Dimensions.get',
    ],
    ignoreProperty: [
      'className', 'style', 'testID', 'id', 'key', 'type', 'name',
      'variant', 'mode', 'path', 'uri', 'source',
      'fontFamily', 'fontWeight', 'textAlign', 'display',
      'flex', 'flexDirection', 'alignItems', 'justifyContent',
    ],
    ignore: ['^[A-Z_]+$', '^#[0-9a-fA-F]+$', '^rgba?\\(', '^M\\d'],
  }],
};

const RULES_OFF_IN_TESTS = [
  'max-lines', 'max-nested-callbacks', 'smart-max-lines/smart-max-lines', 'no-magic-numbers', 'no-script-url',
  'no-console', 'no-null-check/no-null-check', 'prefer-const-enum/prefer-const-enum',
  'enum-file-isolation/enum-file-isolation', 'react/jsx-no-literals', 'i18next/no-literal-string',
  'react-compiler/react-compiler', 'require-stable-hook-args/require-stable-hook-args',
  'enforce-module-structure/enforce-module-structure', 'enforce-function-style/enforce-function-style',
  'no-restricted-imports', 'no-product-imports-in-shared/no-product-imports-in-shared',
  'no-duplicate-shared-patterns/no-duplicate-shared-patterns',
];

export const TEST_FILE_RULES: Linter.RulesRecord = {
  '@typescript-eslint/no-explicit-any': 'warn',
  '@typescript-eslint/no-non-null-assertion': 'off',
  '@typescript-eslint/no-unsafe-argument': 'off',
  '@typescript-eslint/no-unsafe-assignment': 'off',
  '@typescript-eslint/no-unsafe-call': 'off',
  '@typescript-eslint/no-unsafe-member-access': 'off',
  '@typescript-eslint/no-unsafe-return': 'off',
  '@typescript-eslint/require-await': 'off',
  '@typescript-eslint/consistent-type-assertions': ['error', {
    assertionStyle: 'as',
    objectLiteralTypeAssertions: 'allow-as-parameter',
  }],
  ...Object.fromEntries(RULES_OFF_IN_TESTS.map((name) => [name, 'off'])),
};
