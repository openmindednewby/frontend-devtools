import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/eslint/index.ts',
    'src/test-results/index.ts',
    'src/test-results/jestReporter.ts',
    'src/test-results/vitestReporter.ts',
    'src/lighthouse/index.ts',
    'src/metro/index.ts',
    'src/babel/index.ts',
    'src/jest/index.ts',
    'src/jest/setup.ts',
    'src/baseline/cli.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: false,
  treeshake: true,
  minify: false,
  target: 'es2020',
  outDir: 'dist',
  external: ['react', 'react-native'],
});
