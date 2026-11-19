export interface CoverageThreshold {
  branches: number;
  functions: number;
  lines: number;
  statements: number;
}

export interface SharedJestOptions {
  setupFilesAfterEnv?: string[];
  collectCoverageFrom?: string[];
  coverageThreshold?: CoverageThreshold;
  extraTransformModules?: string[];
  moduleNameMapper?: Record<string, string>;
  testEnvironment?: string;
}

const TRANSFORM_MODULES = [
  '(jest-)?react-native', '@react-native(-community)?', 'expo(nent)?', '@expo(nent)?/.*', '@expo-google-fonts/.*',
  'react-navigation', '@react-navigation/.*', '@unimodules/.*', 'unimodules', 'sentry-expo', 'native-base',
  'react-native-svg', 'react-native-paper', 'react-native-vector-icons', '@tanstack/.*', '@reduxjs/.*',
];

const DEFAULT_COVERAGE_FROM = [
  'src/utils/**/*.{ts,tsx}',
  'src/lib/**/*.{ts,tsx}',
  'src/auth/**/*.{ts,tsx}',
  'src/config/**/*.{ts,tsx}',
  'src/store/**/*.{ts,tsx}',
  '!src/**/*.d.ts',
  '!src/**/index.ts',
  '!src/server/**/*',
];

const DEFAULT_COVERAGE_PERCENT = 40;

/** The `transformIgnorePatterns` entry that lets Jest compile RN/Expo packages (plus `extra`). */
export function transformIgnorePattern(extra: readonly string[] = []): string {
  const [first, second, ...rest] = [...TRANSFORM_MODULES, ...extra];
  return `node_modules/(?!(${String(first)}|${String(second)})|${rest.join('|')})`;
}

/** The house jest-expo config; app-specific paths and thresholds come from `options`. */
export function createJestConfig(options: SharedJestOptions = {}): Record<string, unknown> {
  return {
    preset: 'jest-expo',
    setupFilesAfterEnv: options.setupFilesAfterEnv ?? ['<rootDir>/jest.setup.js'],
    testMatch: ['**/__tests__/**/*.test.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
    testPathIgnorePatterns: ['/node_modules/', '/dist/'],
    watchPathIgnorePatterns: ['/dist/', '/node_modules/', '/.expo/', '/.git/'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transformIgnorePatterns: [transformIgnorePattern(options.extraTransformModules)],
    moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1', ...options.moduleNameMapper },
    collectCoverageFrom: options.collectCoverageFrom ?? DEFAULT_COVERAGE_FROM,
    coverageThreshold: {
      global: options.coverageThreshold ?? {
        branches: DEFAULT_COVERAGE_PERCENT,
        functions: DEFAULT_COVERAGE_PERCENT,
        lines: DEFAULT_COVERAGE_PERCENT,
        statements: DEFAULT_COVERAGE_PERCENT,
      },
    },
    testEnvironment: options.testEnvironment ?? 'jsdom',
  };
}
