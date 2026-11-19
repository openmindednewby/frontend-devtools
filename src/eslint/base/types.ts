import type { FlatConfig } from '../types';

export type PluginLike = NonNullable<FlatConfig['plugins']>[string];
export type ParserLike = NonNullable<NonNullable<FlatConfig['languageOptions']>['parser']>;

export interface BaseConfigDeps {
  jsRecommended: FlatConfig;
  prettierConfig: FlatConfig;
  tsParser: ParserLike;
  jsoncParser: ParserLike;
  plugins: {
    typescript: PluginLike;
    react: PluginLike;
    reactHooks: PluginLike;
    reactNative: PluginLike;
    reactNativeA11y: PluginLike;
    import: PluginLike;
    unusedImports: PluginLike;
    reactCompiler: PluginLike;
    i18next: PluginLike;
  };
}

export interface RoutePreloadOptions {
  file: string;
  routeDir: string;
  excludeFiles: string[];
  excludeDirs: string[];
  rootIndexIsRedirect: boolean;
}

export interface BoundaryElement {
  type: string;
  pattern: string | string[];
  mode: string;
  capture: string[];
}

export interface BaseConfigOptions {
  extraIgnores?: string[];
  tsconfigProject?: string;
  stableHookIgnorePatterns?: string[];
  loggerFiles?: string[];
  routePreload?: RoutePreloadOptions | false;
  navPrefixFiles?: string[] | false;
  boundaryElements?: BoundaryElement[];
}
