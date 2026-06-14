/**
 * Custom ESLint Plugin: Enforce Module Structure
 *
 * When a component/feature directory contains 4+ non-test source files,
 * this rule enforces a standard internal structure:
 *
 *   hooks/     — Custom hooks (use*.ts)
 *   components/ — Sub-components (non-index .tsx files)
 *   utils/     — Pure helper functions (non-hook, non-component .ts files)
 *   data/      — Static/mock data files (*Data.ts, *.data.ts)
 *
 * Files that may stay at the directory root:
 *   index.tsx, index.ts, types.ts, constants.ts, schema.ts, columns.ts
 *
 * The rule also allows domain-specific subdirectories (e.g. filters/,
 * columnMenu/, pagination/) — files inside those are exempt because
 * they are already organized by concern.
 *
 * Special directory patterns exempt from sub-component checks:
 *   sections/ — Feature page sections (.tsx files are the primary content)
 *   forms/    — Form components (.tsx are the primary content)
 *
 * Threshold: only enforced when a directory has >= fileThreshold source
 * files (default 4). Simple components with 1-3 files are left alone.
 *
 * Examples:
 *   BAD:  DataGrid/useGridCallbacks.ts        (hook at root, 8 siblings)
 *   GOOD: DataGrid/hooks/useGridCallbacks.ts   (hook in hooks/ subdir)
 *
 *   BAD:  sections/data.ts                     (data mixed with sections)
 *   GOOD: data/gridData.ts                     (data in dedicated subdir)
 *
 *   OK:   sections/BasicGridSection.tsx         (sections dir, .tsx exempt)
 *   OK:   TableNative/columnMenu/useColumnMenu.ts  (domain subdir, exempt)
 *   OK:   Button/index.tsx                      (only 2 files, below threshold)
 */

import { readdirSync } from 'fs';
import { dirname, basename, sep, posix } from 'path';

const FILE_THRESHOLD_DEFAULT = 4;

/** Exact file names allowed to stay at the root of a module directory. */
const ROOT_ALLOWED_BASENAMES = new Set([
  'index.tsx',
  'index.ts',
  'types.ts',
  'constants.ts',
  'schema.ts',
  'columns.ts',
]);

/**
 * File name patterns that are allowed at root.
 * - *Types.ts: type definition files (same purpose as types.ts)
 * - Files containing a single const enum are required by
 *   enum-file-isolation to be standalone — don't force them into utils/.
 *   We detect these by common naming patterns for enum files.
 */
const ROOT_ALLOWED_PATTERNS = [
  /^[a-zA-Z]+Types\.ts$/,  // alertTypes.ts, buttonTypes.ts, etc.
];

/**
 * Directory names where PascalCase .tsx files are the primary content
 * and should NOT be flagged as "move to components/".
 * Hooks, utils, and data files are still flagged in these directories.
 */
const COMPONENT_EXEMPT_DIRS = new Set([
  'sections',
  'forms',
  'Forms',
]);

/**
 * Directory names that are collections of standalone files by design.
 * Files in these directories should not be reorganized into subdirs.
 * Example: shared/ contains type files and enums for multiple consumers.
 */
const FLAT_EXEMPT_DIRS = new Set([
  // Common (shared with SyncfusionThemeStudio)
  'shared',
  'presets',
  'defaults',
  'injectors',
  'types',
  'actions',
  'icons',
  'errors',
  'interceptors',
  'events',
  'routes',
  'utils',
  'components',
  'form-fields',
  // BaseClient-specific
  'enums',
  'testIds',
  'constants',
  'slices',
  'schemas',
  'locales',
  'mutators',
  'customHooks',
  'swagger',
  'models',
  'handlers',
  'menuHandlers',
  'userHandlers',
]);

/**
 * Count non-test, non-directory source files in a directory (shallow).
 * Returns only .ts/.tsx files that are not tests or declarations.
 */
function countSourceFiles(dirPath) {
  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });
    return entries.filter((e) => {
      if (!e.isFile()) return false;
      const name = e.name;
      if (!name.endsWith('.ts') && !name.endsWith('.tsx')) return false;
      if (name.endsWith('.test.ts') || name.endsWith('.test.tsx')) return false;
      if (name.endsWith('.d.ts')) return false;
      return true;
    }).length;
  } catch {
    return 0;
  }
}

/**
 * Check whether the file is inside a non-root subdirectory of its
 * module directory (e.g. hooks/, components/, filters/, columnMenu/).
 * If so, it's already organized and should be exempt.
 */
function isInsideSubdirectory(filePath, moduleRoot) {
  const rel = filePath
    .split(sep)
    .join(posix.sep)
    .slice(moduleRoot.split(sep).join(posix.sep).length + 1);
  // rel looks like "hooks/useX.ts" or "index.tsx"
  return rel.includes('/');
}

/**
 * Determine the "module root" — the nearest ancestor directory that
 * contains an index.ts or index.tsx file. This is the component or
 * page directory boundary.
 */
function findModuleRoot(filePath) {
  let dir = dirname(filePath);
  const maxDepth = 10;
  for (let i = 0; i < maxDepth; i++) {
    try {
      const entries = readdirSync(dir);
      if (entries.includes('index.ts') || entries.includes('index.tsx'))
        return dir;
    } catch {
      return null;
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  return null;
}

const enforceModuleStructureRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce standard module structure: hooks in hooks/, sub-components in components/, ' +
        'utils in utils/, data in data/. Only applies when directory has 4+ source files.',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          fileThreshold: {
            type: 'integer',
            minimum: 2,
            description:
              'Minimum number of non-test source files before structure is enforced',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      hookAtRoot:
        'Hook "{{fileName}}" should be in a hooks/ subdirectory. ' +
        'Move to {{suggestedPath}}.',
      componentAtRoot:
        'Sub-component "{{fileName}}" should be in a components/ subdirectory. ' +
        'Move to {{suggestedPath}}.',
      utilAtRoot:
        'Utility file "{{fileName}}" should be in a utils/ subdirectory. ' +
        'Move to {{suggestedPath}}.',
      dataInSections:
        'Data file "{{fileName}}" should be in a data/ subdirectory, ' +
        'not mixed with section components. Move to {{suggestedPath}}.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const fileThreshold = options.fileThreshold ?? FILE_THRESHOLD_DEFAULT;

    return {
      Program() {
        const filePath = context.filename || context.getFilename();
        if (!filePath) return;

        // Only check .ts/.tsx files
        if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
        if (filePath.endsWith('.d.ts')) return;

        const fileName = basename(filePath);

        // Skip test files — they follow their source files
        if (fileName.endsWith('.test.ts') || fileName.endsWith('.test.tsx'))
          return;

        // Skip root-allowed files (exact matches and patterns)
        if (ROOT_ALLOWED_BASENAMES.has(fileName)) return;
        if (ROOT_ALLOWED_PATTERNS.some((p) => p.test(fileName))) return;

        const dir = dirname(filePath);
        const dirName = basename(dir);

        // Skip files in flat-exempt directories (shared/, presets/, etc.)
        if (FLAT_EXEMPT_DIRS.has(dirName)) return;

        // Find the module root (directory with index.ts/tsx)
        const moduleRoot = findModuleRoot(filePath);
        if (!moduleRoot) return;

        // If the file is already inside a subdirectory of the module root,
        // it's organized — skip
        if (isInsideSubdirectory(filePath, moduleRoot)) return;

        // Count source files in the module root to check threshold
        const sourceFileCount = countSourceFiles(moduleRoot);
        if (sourceFileCount < fileThreshold) return;

        // --- Classify the file and report ---

        const isHook =
          /^use[A-Z]/.test(fileName) &&
          (fileName.endsWith('.ts') || fileName.endsWith('.tsx'));

        const isComponent =
          fileName.endsWith('.tsx') && /^[A-Z]/.test(fileName);

        const isDataFile =
          /[Dd]ata\.tsx?$/.test(fileName) ||
          /\.data\.tsx?$/.test(fileName);

        // Data files in sections/ directory → suggest data/ subdir
        if (isDataFile && dirName === 'sections') {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'dataInSections',
            data: {
              fileName,
              suggestedPath: `data/${fileName}`,
            },
          });
          return;
        }

        if (isHook) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'hookAtRoot',
            data: {
              fileName,
              suggestedPath: `hooks/${fileName}`,
            },
          });
          return;
        }

        // In sections/ and forms/ dirs, .tsx files are the primary content
        // and should NOT be flagged as needing components/ subdir
        if (isComponent && !COMPONENT_EXEMPT_DIRS.has(dirName)) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'componentAtRoot',
            data: {
              fileName,
              suggestedPath: `components/${fileName}`,
            },
          });
          return;
        }

        // Remaining .ts files that aren't root-allowed → utils
        // Skip .tsx files in exempt dirs (they're section/form components)
        if (fileName.endsWith('.ts') && !isDataFile) {
          context.report({
            loc: { line: 1, column: 0 },
            messageId: 'utilAtRoot',
            data: {
              fileName,
              suggestedPath: `utils/${fileName}`,
            },
          });
        }
      },
    };
  },
};

export default {
  rules: {
    'enforce-module-structure': enforceModuleStructureRule,
  },
};
