/**
 * Custom ESLint Plugin: i18n Interpolation Placeholder Enforcement
 *
 * Ensures translation JSON files only use standardized placeholders:
 * {{p1}}, {{p2}}, {{p3}} (compatible with the FM() helper).
 *
 * Detects and autofixes:
 * - Non-standard double-brace placeholders: {{message}} → {{p1}}
 * - Single-brace placeholders: {p1} → {{p1}}
 * - Placeholders exceeding the 3-param FM() limit (error only, no autofix)
 */

const DOUBLE_BRACE_REGEX = /\{\{(\w+)\}\}/g;
const SINGLE_BRACE_REGEX = /(?<!\{)\{(\w+)\}(?!\})/g;
const ALLOWED_NAMES = new Set(['p1', 'p2', 'p3']);
const MAX_POSITIONAL_PARAMS = 3;

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Enforce {{p1}}/{{p2}}/{{p3}} interpolation placeholders in translation JSON files',
    },
    fixable: 'code',
    schema: [],
    messages: {
      nonStandardPlaceholder:
        'Non-standard placeholder "{{placeholder}}" found. Use {{p1}}/{{p2}}/{{p3}} instead.',
      singleBracePlaceholder:
        'Single-brace placeholder "{{{placeholder}}}" found. Use double braces: {{{{{fixedName}}}}}.',
      tooManyPlaceholders:
        'Translation has {{count}} unique placeholders but FM() only supports 3. Refactor the translation string.',
    },
  },

  create(context) {
    return {
      JSONLiteral(node) {
        if (typeof node.value !== 'string') return;

        const raw = node.value;

        // Collect all non-standard double-brace placeholders
        const doubleBraceMatches = [];
        let match;
        while ((match = DOUBLE_BRACE_REGEX.exec(raw)) !== null) {
          if (!ALLOWED_NAMES.has(match[1]))
            doubleBraceMatches.push({ name: match[1], index: match.index });
        }

        // Collect single-brace placeholders (any name)
        const singleBraceMatches = [];
        while ((match = SINGLE_BRACE_REGEX.exec(raw)) !== null)
          singleBraceMatches.push({ name: match[1], index: match.index });

        const hasDoubleBraceIssues = doubleBraceMatches.length > 0;
        const hasSingleBraceIssues = singleBraceMatches.length > 0;

        if (!hasDoubleBraceIssues && !hasSingleBraceIssues) return;

        // Build ordered mapping of unique placeholder names → p1/p2/p3
        const seenNames = [];
        const allMatches = [...doubleBraceMatches, ...singleBraceMatches].sort(
          (a, b) => a.index - b.index,
        );

        for (const m of allMatches) {
          if (!seenNames.includes(m.name) && !ALLOWED_NAMES.has(m.name))
            seenNames.push(m.name);
        }

        // Check if too many unique placeholders
        // Count existing valid ones too
        const existingValid = new Set();
        let m2;
        const tempRegex = /\{\{(\w+)\}\}/g;
        while ((m2 = tempRegex.exec(raw)) !== null) {
          if (ALLOWED_NAMES.has(m2[1])) existingValid.add(m2[1]);
        }

        // Also count single-brace valid ones
        const tempSingleRegex = /(?<!\{)\{(\w+)\}(?!\})/g;
        while ((m2 = tempSingleRegex.exec(raw)) !== null) {
          if (ALLOWED_NAMES.has(m2[1])) existingValid.add(m2[1]);
        }

        const totalUnique = seenNames.length + existingValid.size;

        if (totalUnique > MAX_POSITIONAL_PARAMS) {
          context.report({
            node,
            messageId: 'tooManyPlaceholders',
            data: { count: String(totalUnique) },
          });
          return;
        }

        // Determine the next available positional name
        const usedPositional = new Set(existingValid);
        const nameMap = {};
        const positionalNames = ['p1', 'p2', 'p3'];
        let nextIdx = 0;

        // Skip already-used positional names
        for (const name of seenNames) {
          while (
            nextIdx < positionalNames.length &&
            usedPositional.has(positionalNames[nextIdx])
          )
            nextIdx++;

          if (nextIdx < positionalNames.length) {
            nameMap[name] = positionalNames[nextIdx];
            usedPositional.add(positionalNames[nextIdx]);
            nextIdx++;
          }
        }

        // Report and fix double-brace non-standard placeholders
        if (hasDoubleBraceIssues) {
          const fixedValue = raw.replace(DOUBLE_BRACE_REGEX, (full, name) => {
            if (ALLOWED_NAMES.has(name)) return full;
            const replacement = nameMap[name];
            return replacement !== undefined ? `{{${replacement}}}` : full;
          });

          context.report({
            node,
            messageId: 'nonStandardPlaceholder',
            data: { placeholder: doubleBraceMatches[0].name },
            fix(fixer) {
              let finalValue = fixedValue;

              // Also fix single-brace issues in the same pass
              if (hasSingleBraceIssues)
                finalValue = finalValue.replace(
                  SINGLE_BRACE_REGEX,
                  (full, name) => {
                    if (ALLOWED_NAMES.has(name)) return `{{${name}}}`;
                    const replacement = nameMap[name];
                    return replacement !== undefined
                      ? `{{${replacement}}}`
                      : `{{${name}}}`;
                  },
                );

              return fixer.replaceText(node, JSON.stringify(finalValue));
            },
          });
        } else if (hasSingleBraceIssues) {
          // Only single-brace issues
          const fixedValue = raw.replace(SINGLE_BRACE_REGEX, (full, name) => {
            if (ALLOWED_NAMES.has(name)) return `{{${name}}}`;
            const replacement = nameMap[name];
            return replacement !== undefined
              ? `{{${replacement}}}`
              : `{{${name}}}`;
          });

          context.report({
            node,
            messageId: 'singleBracePlaceholder',
            data: {
              placeholder: singleBraceMatches[0].name,
              fixedName: ALLOWED_NAMES.has(singleBraceMatches[0].name)
                ? singleBraceMatches[0].name
                : nameMap[singleBraceMatches[0].name] ??
                  singleBraceMatches[0].name,
            },
            fix(fixer) {
              return fixer.replaceText(node, JSON.stringify(fixedValue));
            },
          });
        }
      },
    };
  },
};

export default {
  rules: {
    'i18n-interpolation': rule,
  },
};
