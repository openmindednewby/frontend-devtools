import { defineConfig } from 'tsup';

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/eslint/index.ts',
    'src/test-results/index.ts',
    'src/test-results/jestReporter.ts',
    'src/test-results/vitestReporter.ts',
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
});
