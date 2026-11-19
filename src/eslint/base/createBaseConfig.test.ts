import type { FlatConfig } from '../types';
import type { BaseConfigDeps, ParserLike, PluginLike } from './types';

import agoraConfig from './agoraConfig.fixture.json';
import { createBaseConfig } from './createBaseConfig';

const JS_RECOMMENDED_INDEX = 2;
const PRETTIER_INDEX = 15;

function stubDeps(): BaseConfigDeps {
  const plugin = (): PluginLike => ({ rules: {} }) as PluginLike;
  return {
    jsRecommended: { rules: { 'stub-js': 'error' } },
    prettierConfig: { rules: { 'stub-prettier': 'off' } },
    tsParser: {} as ParserLike,
    jsoncParser: {} as ParserLike,
    plugins: {
      typescript: plugin(), react: plugin(), reactHooks: plugin(), reactNative: plugin(), reactNativeA11y: plugin(),
      import: plugin(), unusedImports: plugin(), reactCompiler: plugin(), i18next: plugin(),
    },
  };
}

function shape(block: FlatConfig): unknown {
  return JSON.parse(JSON.stringify({
    files: block.files,
    ignores: block.ignores,
    rules: block.rules,
    globals: block.languageOptions?.globals,
    settings: block.settings,
    parserOptions: block.languageOptions?.parserOptions,
  }));
}

function withoutPluginKeys(blocks: unknown[]): unknown[] {
  return blocks.map((block) => (block === null ? null : { ...(block as Record<string, unknown>), pluginKeys: undefined }));
}

function missingPluginKeys(config: FlatConfig[]): string[] {
  return agoraConfig.flatMap((block, index) => (block?.pluginKeys ?? [])
    .filter((key) => !Object.keys(config[index]?.plugins ?? {}).includes(key))
    .map((key) => `${index}:${key}`));
}

function authoredShapes(config: FlatConfig[]): unknown[] {
  return config.map((block, index) => (index === JS_RECOMMENDED_INDEX || index === PRETTIER_INDEX ? null : shape(block)));
}

describe('createBaseConfig', () => {
  it('with default options, holds every block and rule of the agora-web config', () => {
    const deps = stubDeps();

    const config = createBaseConfig(deps);

    expect(authoredShapes(config)).toEqual(JSON.parse(JSON.stringify(withoutPluginKeys(agoraConfig))));
  });

  it('with default options, registers every plugin namespace the agora-web config registered', () => {
    const deps = stubDeps();

    const config = createBaseConfig(deps);

    expect(missingPluginKeys(config)).toEqual([]);
  });

  it('with default options, places the injected js and prettier configs where agora-web had them', () => {
    const deps = stubDeps();

    const config = createBaseConfig(deps);

    expect([config[JS_RECOMMENDED_INDEX], config[PRETTIER_INDEX]]).toEqual([deps.jsRecommended, deps.prettierConfig]);
  });

  it('with app options, applies ignores, hook patterns and logger files and drops disabled blocks', () => {
    const deps = stubDeps();

    const config = createBaseConfig(deps, {
      extraIgnores: ['src/legacy/**'],
      stableHookIgnorePatterns: ['^useGenerated'],
      loggerFiles: ['src/log.ts'],
      routePreload: false,
      navPrefixFiles: false,
    });

    expect({
      ignores: config[0]?.ignores?.includes('src/legacy/**'),
      hookRule: config[3]?.rules?.['require-stable-hook-args/require-stable-hook-args'],
      logger: config.find((block) => block.files?.includes('src/log.ts'))?.rules,
      length: config.length,
    }).toEqual({
      ignores: true,
      hookRule: ['warn', { ignoreHookPatterns: ['^useGenerated'] }],
      logger: { 'no-console': 'off' },
      length: agoraConfig.length - 2,
    });
  });
});
