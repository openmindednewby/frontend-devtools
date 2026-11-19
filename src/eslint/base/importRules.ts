import type { Linter } from 'eslint';

const IMPORT_ORDER: Linter.RuleEntry = ['error', {
  'groups': ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'object', 'type'],
  'pathGroups': [
    { pattern: 'react', group: 'builtin', position: 'before' },
    { pattern: 'react-native', group: 'builtin', position: 'before' },
    { pattern: 'expo**', group: 'external', position: 'before' },
    { pattern: '@/**', group: 'internal', position: 'before' },
  ],
  'pathGroupsExcludedImportTypes': ['react', 'react-native'],
  'newlines-between': 'always',
  'alphabetize': { order: 'asc', caseInsensitive: true },
}];

export const IMPORT_RULES: Linter.RulesRecord = {
  'import/first': 'error',
  'import/no-duplicates': 'error',
  'import/no-self-import': 'error',
  'import/no-cycle': 'error',
  'import/no-useless-path-segments': 'error',
  'import/newline-after-import': 'error',
  'import/no-mutable-exports': 'error',
  'import/no-default-export': 'off',
  'import/order': IMPORT_ORDER,
  'unused-imports/no-unused-imports': 'error',
  'unused-imports/no-unused-vars': 'off',
};

export const HOUSE_RULES: Linter.RulesRecord = {
  'max-lines': ['error', { max: 200, skipBlankLines: true, skipComments: true }],
  'smart-max-lines/smart-max-lines': ['error', {
    componentMax: 200,
    functionMax: 50,
    skipBlankLines: true,
    skipComments: true,
  }],
  'no-null-check/no-null-check': 'error',
  'prefer-const-enum/prefer-const-enum': 'warn',
  'enum-file-isolation/enum-file-isolation': 'warn',
  'no-barrel-companion-file/no-barrel-companion-file': 'error',
  'no-optional-undefined/no-optional-undefined': 'error',
  'no-generated-models-barrel-value-import/no-generated-models-barrel-value-import': 'error',
  'enforce-module-structure/enforce-module-structure': ['error', { fileThreshold: 4 }],
  'enforce-test-colocation/enforce-test-colocation': 'error',
  'enforce-function-style/enforce-function-style': ['warn', { checkStyle: true, checkOrdering: true }],
  'no-product-imports-in-shared/no-product-imports-in-shared': 'warn',
  'no-duplicate-shared-patterns/no-duplicate-shared-patterns': 'warn',
  'no-restricted-imports': ['error', {
    paths: [{
      name: 'react-i18next',
      importNames: ['useTranslation'],
      message: 'Use FM() from localization/helpers instead of t() from useTranslation(). FM() has no fallback strings — missing keys are immediately visible.',
    }],
  }],
};
