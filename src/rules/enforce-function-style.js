/**
 * Custom ESLint Plugin: Enforce Function Style & Ordering
 *
 * Two independent checks controlled by options:
 *
 * 1. **checkStyle** — Multi-statement functions must use `function` declarations,
 *    not `const`-assigned arrow/function expressions. Single-expression arrows
 *    are fine (concise one-liners). React components are exempt (enforced by
 *    `react/function-component-definition`). Closures/callbacks are exempt.
 *
 * 2. **checkOrdering** — Module-level constants must appear before functions and
 *    exports. Functions and exports may be freely interleaved.
 *    Imports, type declarations, and re-exports are exempt.
 *    This order is compatible with @typescript-eslint/no-use-before-define.
 */

// ---------------------------------------------------------------------------
// Helpers – JSX detection (borrowed from smart-max-lines for consistency)
// ---------------------------------------------------------------------------

function isJSX(node) {
  return node && (node.type === 'JSXElement' || node.type === 'JSXFragment');
}

function expressionReturnsJSX(node) {
  if (!node) return false;
  if (isJSX(node)) return true;
  if (node.type === 'ConditionalExpression')
    return expressionReturnsJSX(node.consequent) || expressionReturnsJSX(node.alternate);
  if (node.type === 'LogicalExpression')
    return expressionReturnsJSX(node.left) || expressionReturnsJSX(node.right);
  if (node.type === 'ParenthesizedExpression')
    return expressionReturnsJSX(node.expression);
  return false;
}

function blockReturnsJSX(body) {
  if (!Array.isArray(body)) return false;
  for (const stmt of body) {
    if (stmt.type === 'ReturnStatement' && expressionReturnsJSX(stmt.argument))
      return true;
    if (stmt.type === 'IfStatement') {
      const check = (branch) => {
        if (!branch) return false;
        if (branch.type === 'BlockStatement') return blockReturnsJSX(branch.body);
        return branch.type === 'ReturnStatement' && expressionReturnsJSX(branch.argument);
      };
      if (check(stmt.consequent) || check(stmt.alternate)) return true;
    }
    if (stmt.type === 'SwitchStatement') {
      for (const c of stmt.cases)
        if (blockReturnsJSX(c.consequent)) return true;
    }
  }
  return false;
}

function functionReturnsJSX(fnNode) {
  if (fnNode.type === 'ArrowFunctionExpression' && fnNode.body.type !== 'BlockStatement')
    return expressionReturnsJSX(fnNode.body);
  if (fnNode.body && fnNode.body.type === 'BlockStatement')
    return blockReturnsJSX(fnNode.body.body);
  return false;
}

// ---------------------------------------------------------------------------
// Helpers – Statement classification for ordering
// ---------------------------------------------------------------------------

/** Exempt statement types that don't participate in ordering zones. */
function isExemptStatement(stmt) {
  if (stmt.type === 'ImportDeclaration') return true;
  if (stmt.type === 'TSTypeAliasDeclaration') return true;
  if (stmt.type === 'TSInterfaceDeclaration') return true;
  if (stmt.type === 'TSEnumDeclaration') return true;
  if (stmt.type === 'ExportAllDeclaration') return true;
  // Type-only exports
  if (stmt.type === 'ExportNamedDeclaration' && stmt.exportKind === 'type') return true;
  // Re-exports (export { ... } from '...')
  if (stmt.type === 'ExportNamedDeclaration' && stmt.source) return true;
  // Empty export declarations (export {};)
  if (stmt.type === 'ExportNamedDeclaration' && !stmt.declaration && stmt.specifiers.length === 0)
    return true;
  return false;
}

/** Check if a VariableDeclaration's init is a function (arrow or function expression). */
function hasFunctionInit(varDecl) {
  if (!varDecl.declarations || varDecl.declarations.length === 0) return false;
  const init = varDecl.declarations[0].init;
  if (!init) return false;
  return init.type === 'ArrowFunctionExpression' || init.type === 'FunctionExpression';
}

/**
 * Classify a top-level statement into a zone for ordering:
 *   1 = constant, 2 = function/export, 0 = exempt
 *
 * Expected file layout (compatible with no-use-before-define):
 *   imports/types → constants → functions & exports (freely interleaved)
 */
function classifyZone(stmt) {
  if (isExemptStatement(stmt)) return 0;

  // Exports → zone 2
  if (stmt.type === 'ExportNamedDeclaration' || stmt.type === 'ExportDefaultDeclaration')
    return 2;

  // Private function declarations → zone 2
  if (stmt.type === 'FunctionDeclaration') return 2;

  // Private variable declarations
  if (stmt.type === 'VariableDeclaration') {
    if (hasFunctionInit(stmt)) return 2; // function-valued → zone 2
    return 1; // plain constant → zone 1
  }

  // Everything else (expression statements, etc.) → exempt
  return 0;
}

/** Get a readable name from a statement for error messages. */
function getStatementName(stmt) {
  if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration) {
    const decl = stmt.declaration;
    if (decl.type === 'FunctionDeclaration' && decl.id) return decl.id.name;
    if (decl.type === 'VariableDeclaration' && decl.declarations[0]?.id)
      return decl.declarations[0].id.name;
  }
  if (stmt.type === 'ExportDefaultDeclaration') return 'default export';
  if (stmt.type === 'FunctionDeclaration' && stmt.id) return stmt.id.name;
  if (stmt.type === 'VariableDeclaration' && stmt.declarations[0]?.id)
    return stmt.declarations[0].id.name;
  return '(anonymous)';
}

// ---------------------------------------------------------------------------
// Helpers – Top-level detection
// ---------------------------------------------------------------------------

/**
 * Check if a VariableDeclarator is at the module top level.
 * A declarator is top-level if its VariableDeclaration parent is directly
 * under Program, or under an ExportNamedDeclaration that is under Program.
 */
function isTopLevel(node) {
  const varDecl = node.parent; // VariableDeclaration
  if (!varDecl) return false;
  const container = varDecl.parent;
  if (!container) return false;
  if (container.type === 'Program') return true;
  if (container.type === 'ExportNamedDeclaration' && container.parent?.type === 'Program')
    return true;
  return false;
}

// ---------------------------------------------------------------------------
// Rule definition
// ---------------------------------------------------------------------------

const enforceFunctionStyleRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Enforce function declarations for multi-statement functions and ' +
        'correct ordering of exports, private functions, and constants.',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          checkStyle: {
            type: 'boolean',
            description: 'Flag const-assigned multi-statement functions (default true)',
          },
          checkOrdering: {
            type: 'boolean',
            description: 'Flag out-of-order module statements (default true)',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      useFunction:
        'Use a function declaration (`function {{name}}`) instead of a ' +
        'const-assigned arrow/function expression for multi-statement functions.',
      constantAfterCode:
        'Module-level constant `{{name}}` should appear before functions and exports.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const checkStyle = options.checkStyle !== false;
    const checkOrdering = options.checkOrdering !== false;

    return {
      // -----------------------------------------------------------------
      // Check 1: Declaration style
      // -----------------------------------------------------------------
      ...(checkStyle
        ? {
            VariableDeclarator(node) {
              // Only care about top-level const-assigned functions
              if (!isTopLevel(node)) return;

              const init = node.init;
              if (!init) return;
              if (init.type !== 'ArrowFunctionExpression' && init.type !== 'FunctionExpression')
                return;

              // Allow single-expression arrows (concise body, no block)
              if (init.type === 'ArrowFunctionExpression' && init.body.type !== 'BlockStatement')
                return;

              // Allow React components (JSX return) — enforced separately
              if (functionReturnsJSX(init)) return;

              // Allow PascalCase names — likely React components (enforced
              // as arrow functions by react/function-component-definition).
              // Components returning null won't be caught by JSX check above.
              const name = node.id?.name ?? '(anonymous)';
              if (/^[A-Z]/.test(name)) return;

              // IIFEs like `const x = (() => {...})()` are implicitly exempt
              // because their init is a CallExpression, filtered by the type
              // check above.

              context.report({
                node,
                messageId: 'useFunction',
                data: { name },
              });
            },
          }
        : {}),

      // -----------------------------------------------------------------
      // Check 2: Ordering
      // -----------------------------------------------------------------
      ...(checkOrdering
        ? {
            'Program:exit'(programNode) {
              let maxZoneSeen = 0;

              for (const stmt of programNode.body) {
                const zone = classifyZone(stmt);
                if (zone === 0) continue; // exempt — ignore

                if (zone < maxZoneSeen) {
                  const name = getStatementName(stmt);
                  const messageId = 'constantAfterCode';

                  context.report({
                    node: stmt,
                    messageId,
                    data: { name },
                  });
                }

                if (zone > maxZoneSeen) maxZoneSeen = zone;
              }
            },
          }
        : {}),
    };
  },
};

export default {
  rules: {
    'enforce-function-style': enforceFunctionStyleRule,
  },
};
