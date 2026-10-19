/** @type {import('jest').Config} */
const NODE_ONLY_TESTS = ['<rootDir>/src/eslint/patternPacks.test.ts'];

const project = {
  preset: 'ts-jest',
  roots: ['<rootDir>/src'],
  // The custom ESLint rules are authored as plain ESM JS (`src/rules/*.js`);
  // ts-jest compiles them (allowJs) so they can be imported from the TS
  // plugin aggregator.
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    // isolatedModules: transpile-only. Type-safety is enforced by the separate
    // `tsc --noEmit` typecheck (which uses the ambient `*.js` declaration); here
    // we only need the rule files compiled to runnable CJS for the tests.
    '^.+\\.(ts|js)$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};

module.exports = {
  projects: [
    { ...project, displayName: 'jsdom', testEnvironment: 'jsdom', testMatch: ['**/*.test.ts'], testPathIgnorePatterns: NODE_ONLY_TESTS },
    { ...project, displayName: 'node', testEnvironment: 'node', testMatch: NODE_ONLY_TESTS },
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/rules/*.js',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
};
