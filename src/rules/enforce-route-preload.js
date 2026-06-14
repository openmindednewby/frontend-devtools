/**
 * Custom ESLint Plugin: Enforce Route Page Preloading
 *
 * Runs on a preloader file (e.g., src/config/routePreloader.ts) and ensures
 * every Expo Router route page in the configured directory has a matching
 * dynamic import() expression. This prevents developers from adding new
 * route pages without preloading them, which would cause slower navigation.
 *
 * Reports:
 *   - missingPreload: route page file has no matching import() in the preloader
 *   - stalePreload: import path does not match any route page file
 *   - noImportsFound: preloader file has no dynamic import() expressions at all
 */

import fs from 'fs';
import path from 'path';

/**
 * Recursively discover route page files in the given directory.
 *
 * A file qualifies as a route page if:
 *   - It is a .tsx file
 *   - It is NOT a _layout.tsx file
 *   - It is NOT inside an excluded directory (e.g., __tests__)
 *   - If it lives in a directory that already has an index.tsx, only index.tsx
 *     itself counts (sibling .tsx files are sub-components, not route entries)
 *   - Direct .tsx files whose name does NOT start with _ are also route pages
 */
function discoverRoutePages(baseDir, options) {
  const {
    excludeFiles = ['_layout.tsx'],
    excludeDirs = ['__tests__'],
    rootIndexIsRedirect = true,
  } = options;

  const routePages = [];

  function walk(dir, relativePrefix) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.join(relativePrefix, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (excludeDirs.includes(entry.name)) continue;

        walk(fullPath, relativePath);
        continue;
      }

      // Only consider .tsx files
      if (!entry.name.endsWith('.tsx')) continue;

      // Skip excluded file names
      if (excludeFiles.includes(entry.name)) continue;

      // Skip files starting with _ (e.g., _layout.tsx already excluded above,
      // but also any other underscore-prefixed files)
      if (entry.name.startsWith('_')) continue;

      // Skip root index if configured as redirect
      const normalizedRelative = relativePath.replace(/\\/g, '/');
      if (rootIndexIsRedirect && normalizedRelative === 'index.tsx') continue;

      // Strip .tsx extension for the normalized path
      const withoutExt = normalizedRelative.replace(/\.tsx$/, '');
      routePages.push(withoutExt);
    }
  }

  walk(baseDir, '');
  return routePages;
}

/**
 * Recursively collect all ImportExpression source paths within an AST subtree.
 */
function collectImportPaths(node) {
  const paths = [];

  function walk(n) {
    if (!n || typeof n !== 'object') return;

    if (n.type === 'ImportExpression' && n.source?.type === 'Literal')
      paths.push({ value: n.source.value, node: n });

    for (const key of Object.keys(n)) {
      if (key === 'parent') continue;
      const child = n[key];
      if (Array.isArray(child))
        child.forEach(walk);
      else if (child?.type)
        walk(child);
    }
  }

  walk(node);
  return paths;
}

/**
 * Resolve a relative import path to an absolute normalized form,
 * then strip the project root prefix to get a project-relative path.
 */
function resolveImportToProjectRelative(importPath, fileDir, projectRoot) {
  // Resolve relative to the file being linted
  const absoluteResolved = path.resolve(fileDir, importPath);
  // Make it relative to the project root
  const projectRelative = path.relative(projectRoot, absoluteResolved);
  // Normalize to forward slashes
  return projectRelative.replace(/\\/g, '/');
}

const enforceRoutePreloadRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Ensure every route page in the configured directory has a matching dynamic import() in the preloader file',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          routeDir: {
            type: 'string',
            description:
              'Directory to scan for route pages, relative to project root',
            default: 'app/(protected)',
          },
          excludeFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Filename patterns to skip',
            default: ['_layout.tsx'],
          },
          excludeDirs: {
            type: 'array',
            items: { type: 'string' },
            description: 'Directory names to skip',
            default: ['__tests__'],
          },
          rootIndexIsRedirect: {
            type: 'boolean',
            description:
              'Whether the root index.tsx in routeDir is just a redirect and should be skipped',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingPreload:
        'Route page "{{routeFile}}" is not preloaded. Add: import(\'{{importPath}}\').catch(() => undefined);',
      stalePreload:
        'Preload import "{{importPath}}" does not match any route page in {{routeDir}}/. Remove it or add the corresponding route page.',
      noImportsFound:
        'Preloader file has no dynamic import() expressions. Add imports for all route pages in {{routeDir}}/.',
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const routeDir = options.routeDir ?? 'app/(protected)';
    const excludeFiles = options.excludeFiles ?? ['_layout.tsx'];
    const excludeDirs = options.excludeDirs ?? ['__tests__'];
    const rootIndexIsRedirect = options.rootIndexIsRedirect ?? true;

    // Determine project root (directory containing eslint.config.mjs)
    const cwd = context.cwd ?? context.getCwd?.() ?? process.cwd();
    const projectRoot = cwd;

    // Determine the directory of the file being linted
    const filename = context.filename ?? context.getFilename?.();
    const fileDir = path.dirname(filename);

    // Discover all route page files
    const routeDirAbsolute = path.resolve(projectRoot, routeDir);
    const routePages = discoverRoutePages(routeDirAbsolute, {
      excludeFiles,
      excludeDirs,
      rootIndexIsRedirect,
    });

    // Build the set of expected normalized paths: "app/(protected)/tenants/index"
    const expectedRouteSet = new Set(
      routePages.map((rp) => `${routeDir}/${rp}`.replace(/\\/g, '/')),
    );

    // Collected during traversal
    const importExpressions = []; // { resolvedPath: string, rawPath: string, node: ASTNode }

    return {
      // Collect all dynamic import() expressions in the file
      ImportExpression(node) {
        if (node.source?.type !== 'Literal') return;
        const rawPath = node.source.value;
        const resolvedPath = resolveImportToProjectRelative(
          rawPath,
          fileDir,
          projectRoot,
        );
        importExpressions.push({ resolvedPath, rawPath, node });
      },

      'Program:exit'(programNode) {
        // If no route pages were discovered, nothing to check
        if (expectedRouteSet.size === 0) return;

        // If preloader has zero imports, report a single error
        if (importExpressions.length === 0) {
          context.report({
            node: programNode,
            messageId: 'noImportsFound',
            data: { routeDir },
          });
          return;
        }

        // Build set of resolved import paths (normalized)
        const importedPaths = new Set(
          importExpressions.map((i) => i.resolvedPath),
        );

        // Check for missing preloads: route pages not covered by any import
        for (const routePath of expectedRouteSet) {
          if (!importedPaths.has(routePath)) {
            // Compute the relative import path from the preloader file to the route
            const routeAbsolute = path.resolve(projectRoot, `${routePath}.tsx`);
            let relativePath = path.relative(fileDir, routeAbsolute);
            // Normalize to forward slashes
            relativePath = relativePath.replace(/\\/g, '/');
            // Ensure it starts with ./
            if (!relativePath.startsWith('.'))
              relativePath = `./${relativePath}`;
            // Strip .tsx extension
            relativePath = relativePath.replace(/\.tsx$/, '');

            context.report({
              node: programNode,
              messageId: 'missingPreload',
              data: {
                routeFile: routePath,
                importPath: relativePath,
              },
            });
          }
        }

        // Check for stale preloads: imports that don't match any route page
        for (const { resolvedPath, rawPath, node } of importExpressions) {
          // Only flag imports that point into the routeDir
          const normalizedRouteDir = routeDir.replace(/\\/g, '/');
          if (!resolvedPath.startsWith(normalizedRouteDir)) continue;

          if (!expectedRouteSet.has(resolvedPath))
            context.report({
              node,
              messageId: 'stalePreload',
              data: {
                importPath: rawPath,
                routeDir,
              },
            });
        }
      },
    };
  },
};

/**
 * Export the plugin
 */
export default {
  rules: {
    'enforce-route-preload': enforceRoutePreloadRule,
  },
};
