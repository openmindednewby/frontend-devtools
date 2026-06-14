/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  // The custom ESLint rules are authored as plain ESM JS (`src/rules/*.js`);
  // ts-jest compiles them (allowJs) so they can be imported from the TS
  // plugin aggregator.
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'src/**/*.ts',
    'src/rules/*.js',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  transform: {
    // isolatedModules: transpile-only. Type-safety is enforced by the separate
    // `tsc --noEmit` typecheck (which uses the ambient `*.js` declaration); here
    // we only need the rule files compiled to runnable CJS for the tests.
    '^.+\\.(ts|js)$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
};
