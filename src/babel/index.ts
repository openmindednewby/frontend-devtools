export interface BabelApi {
  cache: (value: boolean) => void;
}

export interface SharedBabelOptions {
  srcAlias?: string;
  extraPlugins?: unknown[];
}

export interface BabelConfig {
  presets: unknown[];
  plugins: unknown[];
  overrides: Array<{ test: RegExp; plugins: unknown[] }>;
}

/** The house Expo babel config: `@/` alias, import.meta transform, const enums as runtime objects. */
export function createBabelConfig(api: BabelApi, options: SharedBabelOptions = {}): BabelConfig {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', { alias: { '@': options.srcAlias ?? './src' } }],
      'babel-plugin-transform-import-meta',
      ...(options.extraPlugins ?? []),
    ],
    overrides: [
      {
        test: /\.tsx?$/,
        plugins: [['babel-plugin-const-enum', { transform: 'constObject' }]],
      },
    ],
  };
}
