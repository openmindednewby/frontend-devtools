import type { Linter } from 'eslint';

export const OVERLAY_FILE = '.eslint-baseline-overlay.mjs';

const TS_PLUGIN = '@typescript-eslint';
const PLUGIN_NAMES = [TS_PLUGIN, 'member-order-fields', 'member-order-accessors'];

function pick(rules: Linter.RulesRecord, plugin: boolean): string {
  return JSON.stringify(Object.fromEntries(Object.entries(rules).filter(([ruleId]) => ruleId.includes('/') === plugin)));
}

/** Builds the flat config that loads the app config and appends the gated rules. */
export function buildOverlay(appConfigFile: string, rules: Linter.RulesRecord): string {
  return [
    `const appModule = await import(${JSON.stringify(`./${appConfigFile}`)});`,
    'const loaded = await (appModule.default ?? appModule);',
    'const app = typeof loaded === "function" ? await loaded() : loaded;',
    'const list = (Array.isArray(app) ? app : [app]).flat(Infinity);',
    `let ts = list.map((entry) => entry && entry.plugins && entry.plugins[${JSON.stringify(TS_PLUGIN)}]).find(Boolean);`,
    `if (!ts) { try { ts = (await import(${JSON.stringify(`${TS_PLUGIN}/eslint-plugin`)})).default; } catch { ts = undefined; } }`,
    `const plugins = ts ? Object.fromEntries(${JSON.stringify(PLUGIN_NAMES)}.map((name) => [name, ts])) : {};`,
    `const rules = { ...${pick(rules, false)}, ...(ts ? ${pick(rules, true)} : {}) };`,
    'export default [...list, { plugins, rules }];',
    '',
  ].join('\n');
}
