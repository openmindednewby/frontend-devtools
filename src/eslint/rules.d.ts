/**
 * Ambient typing for the custom ESLint rule modules. Each `../rules/*.js`
 * file default-exports a one-rule plugin object: `{ rules: { '<name>': rule } }`.
 *
 * They are authored as plain ESM JS — the canonical ESLint plugin format — so
 * the apps that adopt this package keep loading byte-identical rule logic. They
 * are typed loosely here (and via `allowJs: false`, TS uses THIS declaration
 * rather than re-inferring the JS) so the strict `Rule.RuleModule` shape is
 * applied uniformly across all 17 rules.
 */
declare module '*.js' {
  import type { Rule } from 'eslint';

  const plugin: { rules: Record<string, Rule.RuleModule> };
  export default plugin;
}
