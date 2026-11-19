import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { createBabelConfig } from './babel';
import { createJestConfig, transformIgnorePattern } from './jest';
import { installSharedJestMocks, type JestLike } from './jest/mocks';
import { createResolveRequest, withSharedMetroConfig, type MetroResolveContext } from './metro';

const AGORA_TRANSFORM_IGNORE = 'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-paper|react-native-vector-icons|@tanstack/.*|@reduxjs/.*)';

function fakeContext(): MetroResolveContext {
  return { resolveRequest: (_context, moduleName) => ({ filePath: `fallback:${moduleName}`, type: 'sourceFile' }) };
}

describe('transformIgnorePattern', () => {
  it('with no extra modules, equals the pattern the app jest configs carried', () => {
    const extra: string[] = [];

    const pattern = transformIgnorePattern(extra);

    expect(pattern).toBe(AGORA_TRANSFORM_IGNORE);
  });
});

describe('createJestConfig', () => {
  it('with options, keeps the jest-expo preset and applies setup files and thresholds', () => {
    const threshold = { branches: 10, functions: 20, lines: 30, statements: 40 };

    const config = createJestConfig({ setupFilesAfterEnv: ['<rootDir>/s.js'], coverageThreshold: threshold });

    expect([config.preset, config.setupFilesAfterEnv, config.coverageThreshold]).toEqual([
      'jest-expo', ['<rootDir>/s.js'], { global: threshold },
    ]);
  });
});

describe('createBabelConfig', () => {
  it('with an alias option, caches and maps @ to that alias', () => {
    const api = { cache: jest.fn() };

    const config = createBabelConfig(api, { srcAlias: './app-src' });

    expect([api.cache.mock.calls, config.plugins[0], config.presets]).toEqual([
      [[true]], ['module-resolver', { alias: { '@': './app-src' } }], ['babel-preset-expo'],
    ]);
  });
});

describe('createResolveRequest', () => {
  it('with react, @/ and other modules, resolves host react, src files and falls back otherwise', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'metro-'));
    fs.mkdirSync(path.join(root, 'src', 'lib'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'lib', 'util.ts'), '');
    const resolve = createResolveRequest(root);

    const results = ['react', 'react-dom/client', '@/lib/util', 'lodash'].map((name) => resolve(fakeContext(), name, null).filePath);

    expect(results).toEqual([
      path.join(root, 'node_modules', 'react', 'index.js'),
      path.join(root, 'node_modules', 'react-dom', 'client.js'),
      path.join(root, 'src', 'lib', 'util.ts'),
      'fallback:lodash',
    ]);
  });
});

describe('withSharedMetroConfig', () => {
  it('with a default config, keeps its resolver keys and blocks the build-output dirs', () => {
    const config = { resolver: { sourceExts: ['ts'] }, transformer: {} };

    const result = withSharedMetroConfig(config, { projectRoot: path.join('C:', 'app') });

    const blockList = result.resolver.blockList as RegExp[];
    expect([result.resolver.sourceExts, blockList.length, blockList[0]?.test(path.join('C:', 'app', 'dist', 'a.js'))]).toEqual([
      ['ts'], 3, true,
    ]);
  });
});

describe('installSharedJestMocks', () => {
  it('with a fake jest, registers the house mocks and silences console', () => {
    const mocked: string[] = [];
    const fakeJest: JestLike = { mock: (name: string) => mocked.push(name), fn: () => (): void => undefined, requireActual: () => ({}) };
    const host = { console: { log: console.log } as unknown as Console };

    installSharedJestMocks(fakeJest, host);

    expect([mocked, typeof host.console.warn, host.console.log]).toEqual([
      ['expo-constants', 'expo-secure-store', 'react-native/Libraries/Modal/Modal', 'react-native/Libraries/Components/Switch/Switch', 'react-i18next', 'expo-localization'],
      'function',
      console.log,
    ]);
  });

  it('with the react-i18next mock, t returns the key unchanged', () => {
    const factories = new Map<string, () => unknown>();
    const fakeJest: JestLike = { mock: (name: string, factory: () => unknown) => factories.set(name, factory), fn: () => jest.fn(), requireActual: () => ({}) };
    installSharedJestMocks(fakeJest, { console: {} as Console });
    const i18n = factories.get('react-i18next')?.() as { useTranslation: () => { t: (key: string) => string } };

    const translated = i18n.useTranslation().t('menu.title');

    expect(translated).toBe('menu.title');
  });
});
