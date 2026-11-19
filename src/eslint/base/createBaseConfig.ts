import type { FlatConfig } from '../types';
import type { BaseConfigDeps, BaseConfigOptions, RoutePreloadOptions } from './types';

import { apiConfig, commentsConfig } from '../configs';
import { legacyPlugins } from '../legacy';
import { patternPacksConfig } from '../patternPacks';
import {
  BASE_IGNORES,
  DEFAULT_BOUNDARY_ELEMENTS,
  DEFAULT_NAV_PREFIX_FILES,
  DEFAULT_ROUTE_PRELOAD,
  DEFAULT_STABLE_HOOK_IGNORE_PATTERNS,
  LOCALE_FILES,
  SRC_FILES,
  TEST_FILES,
  TS_FILES,
} from './defaults';
import { JEST_SETUP_GLOBALS, REACT_NATIVE_GLOBALS, TEST_GLOBALS } from './globals';
import { I18N_LITERAL_STRING_RULES, TEST_FILE_RULES } from './i18nRules';
import { HOUSE_RULES, IMPORT_RULES } from './importRules';
import { QUALITY_RULES } from './qualityRules';
import { REACT_NATIVE_RULES, REACT_RULES, stableHookArgsRule } from './reactRules';
import { TYPESCRIPT_RULES } from './typescriptRules';

const HOUSE_PLUGINS = legacyPlugins as unknown as NonNullable<FlatConfig['plugins']>;

function typescriptBlock(deps: BaseConfigDeps, options: BaseConfigOptions): FlatConfig {
  const { plugins } = deps;
  return {
    files: TS_FILES,
    languageOptions: {
      parser: deps.tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
        project: options.tsconfigProject ?? './tsconfig.json',
      },
      globals: REACT_NATIVE_GLOBALS,
    },
    plugins: {
      '@typescript-eslint': plugins.typescript,
      'react': plugins.react,
      'react-hooks': plugins.reactHooks,
      'react-native': plugins.reactNative,
      'react-native-a11y': plugins.reactNativeA11y,
      'import': plugins.import,
      'unused-imports': plugins.unusedImports,
      'react-compiler': plugins.reactCompiler,
      ...HOUSE_PLUGINS,
    },
    settings: {
      'react': { version: 'detect' },
      'import/resolver': { typescript: { alwaysTryTypes: true } },
    },
    rules: {
      ...TYPESCRIPT_RULES,
      ...REACT_RULES,
      ...stableHookArgsRule(options.stableHookIgnorePatterns ?? DEFAULT_STABLE_HOOK_IGNORE_PATTERNS),
      ...REACT_NATIVE_RULES,
      ...IMPORT_RULES,
      ...HOUSE_RULES,
      ...QUALITY_RULES,
    },
  };
}

function routePreloadBlocks(routePreload: RoutePreloadOptions | false): FlatConfig[] {
  if (routePreload === false) {
    return [];
  }
  const { file, ...ruleOptions } = routePreload;
  return [{
    files: [file],
    plugins: HOUSE_PLUGINS,
    rules: { 'enforce-route-preload/enforce-route-preload': ['error', ruleOptions] },
  }];
}

function navPrefixBlocks(files: string[] | false): FlatConfig[] {
  if (files === false) {
    return [];
  }
  return [{ files, plugins: HOUSE_PLUGINS, rules: { 'no-duplicate-nav-prefix/no-duplicate-nav-prefix': 'error' } }];
}

function i18nBlocks(deps: BaseConfigDeps): FlatConfig[] {
  return [
    { files: TS_FILES, plugins: { i18next: deps.plugins.i18next }, rules: I18N_LITERAL_STRING_RULES },
    { files: TEST_FILES, languageOptions: { globals: TEST_GLOBALS }, rules: TEST_FILE_RULES },
  ];
}

function sourceRuleBlocks(deps: BaseConfigDeps, options: BaseConfigOptions): FlatConfig[] {
  return [
    { files: options.loggerFiles ?? ['src/utils/logger.ts'], rules: { 'no-console': 'off' } },
    {
      files: LOCALE_FILES,
      languageOptions: { parser: deps.jsoncParser },
      plugins: HOUSE_PLUGINS,
      rules: { 'i18n-interpolation/i18n-interpolation': 'error' },
    },
    {
      files: SRC_FILES,
      ignores: ['src/**/__tests__/**', 'src/**/*.test.*'],
      plugins: HOUSE_PLUGINS,
      rules: { 'i18n-param-names/i18n-param-names': 'error' },
    },
    ...routePreloadBlocks(options.routePreload ?? DEFAULT_ROUTE_PRELOAD),
    ...navPrefixBlocks(options.navPrefixFiles ?? DEFAULT_NAV_PREFIX_FILES),
  ];
}

/** The house flat config for RN/Expo web apps; plugins come from the app, app paths from `options`. */
export function createBaseConfig(deps: BaseConfigDeps, options: BaseConfigOptions = {}): FlatConfig[] {
  return [
    { ignores: [...BASE_IGNORES, ...(options.extraIgnores ?? [])] },
    { files: ['jest.setup.js'], languageOptions: { globals: JEST_SETUP_GLOBALS } },
    deps.jsRecommended,
    typescriptBlock(deps, options),
    ...i18nBlocks(deps),
    ...sourceRuleBlocks(deps, options),
    commentsConfig,
    apiConfig,
    { files: SRC_FILES, ...patternPacksConfig },
    { files: SRC_FILES, settings: { 'boundaries/elements': options.boundaryElements ?? DEFAULT_BOUNDARY_ELEMENTS } },
    deps.prettierConfig,
    { files: TS_FILES, rules: { curly: ['error', 'multi'] } },
  ];
}
