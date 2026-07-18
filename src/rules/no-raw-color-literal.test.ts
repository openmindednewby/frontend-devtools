/**
 * Tests for `no-raw-color-literal` — the gate that keeps colours in design tokens.
 *
 * The two behaviours worth pinning are the PRECISION ones, because a colour rule that cries wolf
 * gets disabled and then protects nothing:
 *   1. `'#main-content'` (an anchor/selector) must NOT be flagged — hence the anchored full-hex
 *      test rather than a substring search.
 *   2. `rgba(...)` buried inside a bigger value (a gradient/shadow) MUST be flagged — hence the
 *      unanchored functional-colour test, including inside template-literal chunks.
 */
import { RuleTester } from 'eslint';

import plugin from './no-raw-color-literal.js';

const rule = plugin.rules['no-raw-color-literal'] as unknown as Parameters<RuleTester['run']>[1];

const ruleTester = new RuleTester({
  parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
});

ruleTester.run('no-raw-color-literal', rule, {
  valid: [
    // Colours coming from the theme/tokens — the whole point of the rule.
    { code: "const c = colors.primary;" },
    { code: "const c = theme.palette.primary['500'];" },

    // A '#'-prefixed string that is NOT a colour must not be flagged.
    { code: "const target = '#main-content';" },
    { code: "const href = 'https://example.test/docs#tiers';" },

    // Keywords are not literals to tokenise.
    { code: "const c = 'transparent';" },
    { code: "const c = 'currentColor';" },

    // Template literal with NO baked-in colour (the value is interpolated from a token).
    { code: 'const shadow = `0 0 0 3px ${ring}`;' },

    // Exempt paths: token/theme definitions must state real colours somewhere.
    {
      code: "export const AML_TOKENS = { primary: '#38bdf8' };",
      filename: '/repo/packages/design-tokens/src/presets.ts',
      options: [{ allow: ['design-tokens'] }],
    },
  ],

  invalid: [
    // A bare hex literal.
    {
      code: "const c = '#38bdf8';",
      errors: [{ messageId: 'rawColor' }],
    },
    // Short hex.
    {
      code: "const c = '#fff';",
      errors: [{ messageId: 'rawColor' }],
    },
    // Functional colour inside a larger value (shadow) — the case a naive
    // "does the string equal a colour?" check would miss entirely.
    {
      code: "const shadow = '0 8px 22px -8px rgba(56, 189, 248, 0.7)';",
      errors: [{ messageId: 'rawColor' }],
    },
    // ...and the same thing inside a template-literal chunk.
    {
      code: 'const bg = `linear-gradient(180deg, rgba(56,189,248,.2), ${end})`;',
      errors: [{ messageId: 'rawColor' }],
    },
    // hsl() counts too.
    {
      code: "const c = 'hsl(200 90% 60%)';",
      errors: [{ messageId: 'rawColor' }],
    },
    // A file NOT covered by `allow` is still gated even when other paths are exempt.
    {
      code: "const c = '#4f46e5';",
      filename: '/repo/apps/aml-v2/src/components/Thing.tsx',
      options: [{ allow: ['design-tokens'] }],
      errors: [{ messageId: 'rawColor' }],
    },
  ],
});
