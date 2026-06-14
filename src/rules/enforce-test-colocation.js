/**
 * Custom ESLint Plugin: Enforce Test Colocation
 *
 * Flags test files that live in __tests__/ directories instead of being
 * co-located next to the source file they test.
 *
 * Co-located tests are easier to find, easier to maintain, and make it
 * obvious which files have test coverage at a glance.
 *
 * Examples:
 *   BAD:  DataGrid/__tests__/useGridCallbacks.test.ts
 *   GOOD: DataGrid/hooks/useGridCallbacks.test.ts  (next to source)
 *
 *   BAD:  lib/api/errors/__tests__/apiError.test.ts
 *   GOOD: lib/api/errors/apiError.test.ts  (next to source)
 *
 *   OK:   hooks/useGridCallbacks.test.ts  (already co-located)
 */

import { dirname, basename, sep, posix } from 'path';

const enforceTestColocationRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Test files should be co-located next to their source file, ' +
        'not placed in a __tests__/ directory.',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
    messages: {
      testInTestsDir:
        'Test file "{{fileName}}" is inside a __tests__/ directory. ' +
        'Move it next to its source file for co-location. ' +
        'Suggested: {{suggestedPath}}',
    },
  },

  create(context) {
    return {
      Program() {
        const filePath = context.filename || context.getFilename();
        if (!filePath) return;

        const fileName = basename(filePath);

        // Only check test files
        if (!fileName.endsWith('.test.ts') && !fileName.endsWith('.test.tsx'))
          return;

        // Normalize path separators for consistent checking
        const normalized = filePath.split(sep).join(posix.sep);

        // Check if the file is inside a __tests__/ directory
        if (!normalized.includes('/__tests__/')) return;

        // Build the suggested co-located path:
        // __tests__/foo.test.ts → ../foo.test.ts (next to source)
        const dir = dirname(filePath);
        const parentDir = dirname(dir);
        const parentDirName = basename(parentDir);

        context.report({
          loc: { line: 1, column: 0 },
          messageId: 'testInTestsDir',
          data: {
            fileName,
            suggestedPath: `${parentDirName}/${fileName}`,
          },
        });
      },
    };
  },
};

export default {
  rules: {
    'enforce-test-colocation': enforceTestColocationRule,
  },
};
