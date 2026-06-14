/**
 * Custom ESLint Plugin: No Duplicate Shared Patterns
 *
 * Warns when product module directories create components with names
 * that match existing shared components in src/components/. This
 * helps prevent accidental duplication of shared UI patterns.
 *
 * Scanned directories (product-specific code):
 *   - packages/* /src/ (product module packages)
 *   - src/features/ (feature directories)
 *
 * Reference directory (shared components):
 *   - src/components/ (recursively scanned for .tsx basenames)
 *
 * The rule collects all .tsx file basenames from src/components/ at
 * startup and warns when a .tsx file in a product directory has the
 * same basename.
 *
 * Examples:
 *   WARN: packages/onlinemenu-module/src/components/EmptyState.tsx
 *         (when src/components/Shared/EmptyState.tsx exists)
 *
 *   OK:   packages/onlinemenu-module/src/components/MenuCard.tsx
 *         (no matching shared component)
 *
 *   OK:   packages/onlinemenu-module/src/index.ts
 *         (not a .tsx component file)
 */

import { readdirSync, existsSync } from 'fs';
import { posix, sep, basename, join } from 'path';

/**
 * Normalize a file path to use forward slashes.
 */
function normalizePath(filePath) {
  return filePath.split(sep).join(posix.sep);
}

/**
 * Recursively collect all .tsx basenames from a directory.
 * Skips test files and index files.
 */
function collectComponentNames(dirPath) {
  const names = new Set();
  if (!existsSync(dirPath)) return names;

  function walk(dir) {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          walk(join(dir, entry.name));
          continue;
        }
        const name = entry.name;
        if (!name.endsWith('.tsx')) continue;
        if (name.endsWith('.test.tsx')) continue;
        if (name === 'index.tsx') continue;
        names.add(name);
      }
    } catch {
      // Directory not readable, skip
    }
  }

  walk(dirPath);
  return names;
}

/**
 * Check whether a file is inside a product-specific directory.
 */
function isInsideProductDirectory(filePath) {
  const normalized = normalizePath(filePath);
  return (
    normalized.includes('/packages/') &&
    normalized.includes('-module/src/')
  ) || normalized.includes('/src/features/');
}

/**
 * Find the BaseClient src/components/ directory from a file path.
 * Walks up looking for BaseClient/src/components/.
 */
function findSharedComponentsDir(filePath) {
  const normalized = normalizePath(filePath);
  const baseClientIdx = normalized.indexOf('/BaseClient/');
  if (baseClientIdx === -1) return null;
  const baseClientRoot = filePath
    .split(sep)
    .join(posix.sep)
    .slice(0, baseClientIdx + '/BaseClient'.length);
  // Convert back to OS path
  const osPath = baseClientRoot.split(posix.sep).join(sep);
  return join(osPath, 'src', 'components');
}

/** Cache shared component names per components dir. */
const sharedNamesCache = new Map();

const noDuplicateSharedPatternsRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Warn when product modules create components that share names ' +
        'with existing shared components in src/components/.',
      category: 'Best Practices',
      recommended: false,
    },
    schema: [],
    messages: {
      duplicateSharedPattern:
        '"{{fileName}}" already exists as a shared component in ' +
        'src/components/. Consider reusing the shared version or ' +
        'renaming this component to clarify its purpose.',
    },
  },

  create(context) {
    const filePath = context.filename || context.getFilename();
    if (!filePath) return {};

    // Only check .tsx files (components)
    if (!filePath.endsWith('.tsx')) return {};

    const fileName = basename(filePath);

    // Skip test files and index files
    if (fileName.endsWith('.test.tsx')) return {};
    if (fileName === 'index.tsx') return {};

    // Only check files in product-specific directories
    if (!isInsideProductDirectory(filePath)) return {};

    return {
      Program() {
        const componentsDir = findSharedComponentsDir(filePath);
        if (!componentsDir) return;

        // Cache the shared component names
        if (!sharedNamesCache.has(componentsDir))
          sharedNamesCache.set(
            componentsDir,
            collectComponentNames(componentsDir),
          );

        const sharedNames = sharedNamesCache.get(componentsDir);

        if (sharedNames.has(fileName))
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'duplicateSharedPattern',
            data: { fileName },
          });
      },
    };
  },
};

export default {
  rules: {
    'no-duplicate-shared-patterns': noDuplicateSharedPatternsRule,
  },
};
