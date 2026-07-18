/**
 * Custom ESLint Plugin: No Raw Color Literal
 *
 * Turns "use design tokens, not hardcoded colours" from a convention into a gate.
 *
 * Why this exists: a raw colour literal is invisible until you try to rebrand. Changing the
 * PROOViD accent from indigo to sky-blue meant a find-and-replace of `#4f46e5` across a dozen
 * docs files plus three C# controllers, because every surface had hardcoded its own accent —
 * archaeology instead of one token edit. Every literal you allow today is a file someone greps
 * later. Colours belong in `@dloizides/design-tokens` and reach components through the theme.
 *
 * Examples:
 *   FLAGGED:  const c = '#38bdf8';
 *   FLAGGED:  backgroundColor: '#fff'
 *   FLAGGED:  boxShadow: `0 0 0 3px rgba(56, 189, 248, .15)`
 *   FLAGGED:  border: 'hsl(200 90% 60%)'
 *
 *   NOT FLAGGED:
 *     colors.primary                      // from the theme
 *     theme.palette.primary['500']        // from the theme
 *     '#main-content'                     // an anchor/selector, not a colour
 *     'transparent' / 'currentColor'      // keywords, not literals to tokenise
 *     anything under a path in the `allow` option (token/theme definitions must
 *     state real colours SOMEWHERE — that somewhere is the token package)
 *
 * Options:
 *   { allow: string[] }  path substrings that are exempt, e.g.
 *                        ["design-tokens", "theme/tokens", ".test."]
 *   The package owns the rule logic; the app owns which paths are exempt and the
 *   severity — the same split as every other rule in this pack.
 */

/** A string that IS a colour: #rgb, #rgba, #rrggbb, #rrggbbaa. Anchored, so `#section` is safe. */
const FULL_HEX_COLOR = /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

/**
 * Functional colour syntax anywhere in the string. Unanchored on purpose: these show up INSIDE
 * bigger values (gradients, shadows) where the literal is not itself a bare colour, e.g.
 * `0 8px 22px -8px rgba(56,189,248,.7)`.
 */
const FUNCTIONAL_COLOR = /\b(?:rgba?|hsla?)\s*\(/;

/** True when the raw source text contains a colour we want tokenised. */
function containsRawColor(text) {
  if (typeof text !== 'string' || text.length === 0) return false;
  if (FULL_HEX_COLOR.test(text.trim())) return true;
  return FUNCTIONAL_COLOR.test(text);
}

/** True when this file is exempt (token/theme definitions, or whatever the app allows). */
function isAllowedFile(filename, allow) {
  if (typeof filename !== 'string') return false;
  const normalised = filename.split('\\').join('/');
  return allow.some((fragment) => normalised.includes(fragment));
}

const noRawColorLiteralRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw colour literals (hex / rgb() / hsl()) in app code. Colours belong in @dloizides/design-tokens and reach components through the theme.',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      rawColor:
        'Raw colour literal "{{value}}" — use a design token instead (@dloizides/design-tokens via the theme). Hardcoded colours make a rebrand a find-and-replace across every file.',
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const allow = Array.isArray(options.allow) ? options.allow : [];

    const filename =
      typeof context.getFilename === 'function' ? context.getFilename() : context.filename;

    if (isAllowedFile(filename, allow)) return {};

    /** Report `node`, trimming the display value so a long gradient stays readable. */
    const report = (node, rawValue) => {
      const value = rawValue.trim();
      const display = value.length > 40 ? `${value.slice(0, 40)}…` : value;
      context.report({ node, messageId: 'rawColor', data: { value: display } });
    };

    return {
      Literal(node) {
        if (typeof node.value !== 'string') return;
        if (!containsRawColor(node.value)) return;
        report(node, node.value);
      },

      // Template literals: check each static chunk, so an interpolated value
      // (`${primary}`) is fine but a baked-in rgba(...) chunk is not.
      TemplateElement(node) {
        const raw = node.value?.raw;
        if (!containsRawColor(raw)) return;
        report(node, raw);
      },
    };
  },
};

export default {
  rules: {
    'no-raw-color-literal': noRawColorLiteralRule,
  },
};
