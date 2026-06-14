/**
 * Custom ESLint Plugin: i18n Parameter Name Enforcement
 *
 * Ensures that t() calls from react-i18next use standardized
 * interpolation parameter names: p1, p2, p3. This complements the
 * i18n-interpolation rule (which enforces {{p1}}/{{p2}}/{{p3}} in
 * translation JSON files) by checking the call sites in TypeScript/TSX.
 *
 * DETECTS:
 *   t('key', { count })          — non-standard param name "count"
 *   t('key', { message: err })   — non-standard param name "message"
 *
 * ALLOWED:
 *   FM('key', value)             — FM() enforces positional params by design
 *   t('key', { p1: value })      — standard param name
 *   t('key', { p1, p2 })         — shorthand with correct names
 *   t('key', 'default value')    — string default (not an interpolation object)
 *
 * RECOMMENDS: Use FM() instead of t() for parameterized translations.
 */

const ALLOWED_PARAM_NAMES = new Set(['p1', 'p2', 'p3']);

// i18next configuration keys that are NOT interpolation params
const I18NEXT_CONFIG_KEYS = new Set([
  'defaultValue',
  'ns',
  'lng',
  'context',
  'returnObjects',
  'keySeparator',
  'nsSeparator',
  'interpolation',
  'joinArrays',
  'postProcess',
  'replace',
  'ordinal',
  'formatParams',
  'missingInterpolationHandler',
]);

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce p1/p2/p3 parameter names in t() interpolation calls. ' +
        'Translation JSON uses {{p1}}/{{p2}}/{{p3}} placeholders, so call sites ' +
        'must pass { p1: value } — not { count: value } or other names.',
      category: 'Possible Errors',
      recommended: true,
    },
    schema: [],
    messages: {
      nonStandardParam:
        'Non-standard interpolation param "{{paramName}}" in t() call. ' +
        'Translation placeholders use {{p1}}/{{p2}}/{{p3}}. ' +
        'Use FM(key, value) or t(key, { p1: value }) instead.',
      preferFM:
        'Prefer FM() over t() for parameterized translations. ' +
        'FM() enforces positional params (p1, p2, p3) by design.',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        // Only match t('key', { ... }) calls
        if (node.callee.type !== 'Identifier' || node.callee.name !== 't')
          return;

        // Need at least 2 arguments: t(key, options)
        if (node.arguments.length < 2) return;

        // Find the options argument — could be 2nd or 3rd arg
        // t(key, defaultValue, options) or t(key, options)
        const optionsArg = node.arguments.length >= 3
          ? node.arguments[2]
          : node.arguments[1];

        // Only check object literals (not variables or expressions)
        if (!optionsArg || optionsArg.type !== 'ObjectExpression') return;

        const properties = optionsArg.properties;

        for (const prop of properties) {
          // Skip spread elements
          if (prop.type === 'SpreadElement') continue;

          const keyName =
            prop.key.type === 'Identifier'
              ? prop.key.name
              : prop.key.type === 'Literal'
                ? String(prop.key.value)
                : null;

          if (keyName === null) continue;

          // Skip known i18next config keys
          if (I18NEXT_CONFIG_KEYS.has(keyName)) continue;

          // Flag non-standard interpolation param names
          if (!ALLOWED_PARAM_NAMES.has(keyName))
            context.report({
              node: prop,
              messageId: 'nonStandardParam',
              data: { paramName: keyName },
            });
        }
      },
    };
  },
};

export default {
  rules: {
    'i18n-param-names': rule,
  },
};
