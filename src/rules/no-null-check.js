/**
 * Custom ESLint Plugin: No Null/Undefined Check
 *
 * Prohibits direct null/undefined checks (!== null, === null, !== undefined, === undefined)
 * and requires using isValueDefined() or isNullOrUndefined() from '@dloizides/utils' instead.
 *
 * These utility functions handle both null and undefined, providing
 * consistent and safer null checking across the codebase.
 *
 * Examples:
 *   BAD:  if (item !== null) { ... }
 *   BAD:  if (item !== undefined) { ... }
 *   GOOD: if (isValueDefined(item)) { ... }
 *
 *   BAD:  if (item === null) { ... }
 *   BAD:  if (item === undefined) { ... }
 *   GOOD: if (!isValueDefined(item)) { ... }
 *   GOOD: if (isNullOrUndefined(item)) { ... }
 */

/** Where `isValueDefined` is imported from when the fixer has to add the import. */
const DEFAULT_UTIL_IMPORT_PATH = '@dloizides/utils';

/** The guard the autofix rewrites to. Must be in scope for the fixed code to compile. */
const GUARD_NAME = 'isValueDefined';

/** How `isValueDefined` is bound in the file under lint, if at all. */
const BindingKind = {
  /** Not bound — the fixer must add an import. */
  None: 'none',
  /** Already imported — the fixer may rewrite freely. */
  Imported: 'imported',
  /** Declared/exported *by this file* — never autofix (it would self-import). */
  Local: 'local',
};

/**
 * Determine how `isValueDefined` is bound at the top level of `ast`.
 *
 * This is what makes the autofix safe: before ES-04 the fixer emitted
 * `isValueDefined(...)` unconditionally, so `eslint --fix` corrupted every file
 * that did not already import it.
 */
function findGuardBinding(ast) {
  for (const statement of ast.body) {
    if (statement.type === 'ImportDeclaration') {
      for (const specifier of statement.specifiers) {
        if (specifier.local && specifier.local.name === GUARD_NAME) return BindingKind.Imported;
      }
      continue;
    }

    // `export { isValueDefined } from './guards/isValueDefined'` — the barrel that
    // re-exports the guard. Re-exports create no local binding, but importing the
    // guard into its own barrel is still wrong, so treat it as local.
    if (statement.type === 'ExportNamedDeclaration') {
      for (const specifier of statement.specifiers || []) {
        if (specifier.exported && specifier.exported.name === GUARD_NAME) return BindingKind.Local;
      }
    }

    const declaration =
      statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (!declaration) continue;

    if (declaration.type === 'FunctionDeclaration' && declaration.id?.name === GUARD_NAME) {
      return BindingKind.Local;
    }
    if (declaration.type === 'VariableDeclaration') {
      for (const declarator of declaration.declarations) {
        if (declarator.id?.type === 'Identifier' && declarator.id.name === GUARD_NAME) {
          return BindingKind.Local;
        }
      }
    }
  }

  return BindingKind.None;
}

/**
 * Insert `import { isValueDefined } from '<utilImportPath>';` — after the last
 * existing import, or at the very top of the file when there are none.
 *
 * When a file has several violations, every report's fix carries this same
 * insertion. ESLint applies one and defers the rest (overlapping ranges), then
 * re-runs; on the next pass the import exists, `guardIsImported` is true, and the
 * remaining rewrites apply cleanly. Converges in two passes.
 */
function buildGuardImportFix(fixer, sourceCode, utilImportPath) {
  const importStatement = `import { ${GUARD_NAME} } from '${utilImportPath}';`;
  const imports = sourceCode.ast.body.filter((node) => node.type === 'ImportDeclaration');

  if (imports.length > 0) {
    return fixer.insertTextAfter(imports[imports.length - 1], `\n${importStatement}`);
  }

  return fixer.insertTextBeforeRange([0, 0], `${importStatement}\n`);
}

const noNullCheckRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow direct null/undefined checks. Use isValueDefined() or isNullOrUndefined() instead.',
      category: 'Best Practices',
      recommended: true,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          utilImportPath: {
            type: 'string',
            description: 'Import path for the utility functions',
            default: '@dloizides/utils',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      noNotEqualsNull:
        'Avoid "!== null" checks. Use isValueDefined({{identifier}}) instead, which handles both null and undefined.',
      noEqualsNull:
        'Avoid "=== null" checks. Use !isValueDefined({{identifier}}) or isNullOrUndefined({{identifier}}) instead.',
      noNotEqualsNullComplex:
        'Avoid "!== null" checks. Use isValueDefined() instead, which handles both null and undefined.',
      noEqualsNullComplex:
        'Avoid "=== null" checks. Use !isValueDefined() or isNullOrUndefined() instead.',
      noNotEqualsUndefined:
        'Avoid "!== undefined" checks. Use isValueDefined({{identifier}}) instead, which handles both null and undefined.',
      noEqualsUndefined:
        'Avoid "=== undefined" checks. Use !isValueDefined({{identifier}}) or isNullOrUndefined({{identifier}}) instead.',
      noNotEqualsUndefinedComplex:
        'Avoid "!== undefined" checks. Use isValueDefined() instead, which handles both null and undefined.',
      noEqualsUndefinedComplex:
        'Avoid "=== undefined" checks. Use !isValueDefined() or isNullOrUndefined() instead.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode || context.getSourceCode();
    const options = context.options[0] || {};
    const utilImportPath = options.utilImportPath ?? DEFAULT_UTIL_IMPORT_PATH;

    // The autofix rewrites `x === undefined` to `!isValueDefined(x)`. That is only
    // valid source if `isValueDefined` is actually in scope — otherwise `--fix`
    // silently produces a file referencing an undeclared global (which then trips
    // no-unsafe-call / strict-boolean-expressions). So resolve, ONCE per pass,
    // whether the guard is already bound in this file; if not, the fix also
    // inserts the import.
    const guardBinding = findGuardBinding(sourceCode.ast);
    const declaresGuardItself = guardBinding === BindingKind.Local;
    const guardIsImported = guardBinding === BindingKind.Imported;

    /**
     * Build the fix for one violation: the expression rewrite, plus the
     * `isValueDefined` import when the file does not already have it.
     *
     * Returns `null` (no autofix) for the module that *defines* the guard —
     * importing a symbol into the file that exports it would be nonsense.
     */
    function buildFix(fixer, node, replacementText) {
      if (declaresGuardItself) return null;

      const rewrite = fixer.replaceText(node, replacementText);
      if (guardIsImported) return rewrite;

      return [rewrite, buildGuardImportFix(fixer, sourceCode, utilImportPath)];
    }

    /**
     * Check if a node is a null literal
     */
    function isNullLiteral(node) {
      return node && node.type === 'Literal' && node.value === null;
    }

    /**
     * Check if a node is an undefined identifier
     */
    function isUndefinedIdentifier(node) {
      return node && node.type === 'Identifier' && node.name === 'undefined';
    }

    /**
     * Get the source text for a node
     */
    function getNodeText(node) {
      return sourceCode.getText(node);
    }

    /**
     * Check if the identifier is simple enough for a clean message
     */
    function isSimpleIdentifier(node) {
      return (
        node.type === 'Identifier' ||
        (node.type === 'MemberExpression' && !node.computed)
      );
    }

    /**
     * Handle binary expressions (===, !==)
     */
    function checkBinaryExpression(node) {
      const { operator, left, right } = node;

      // Only handle === and !==
      if (operator !== '===' && operator !== '!==') {
        return;
      }

      // Check if either side is null or undefined
      const leftIsNull = isNullLiteral(left);
      const rightIsNull = isNullLiteral(right);
      const leftIsUndefined = isUndefinedIdentifier(left);
      const rightIsUndefined = isUndefinedIdentifier(right);

      const isNullCheck = leftIsNull || rightIsNull;
      const isUndefinedCheck = leftIsUndefined || rightIsUndefined;

      if (!isNullCheck && !isUndefinedCheck) {
        return;
      }

      // Get the non-null/undefined operand
      const valueNode = (leftIsNull || leftIsUndefined) ? right : left;
      const valueText = getNodeText(valueNode);
      const isSimple = isSimpleIdentifier(valueNode);

      if (operator === '!==') {
        // item !== null/undefined -> isValueDefined(item)
        const messageId = isNullCheck
          ? (isSimple ? 'noNotEqualsNull' : 'noNotEqualsNullComplex')
          : (isSimple ? 'noNotEqualsUndefined' : 'noNotEqualsUndefinedComplex');

        context.report({
          node,
          messageId,
          data: isSimple ? { identifier: valueText } : {},
          fix(fixer) {
            return buildFix(fixer, node, `isValueDefined(${valueText})`);
          },
        });
      } else {
        // item === null/undefined -> !isValueDefined(item)
        const messageId = isNullCheck
          ? (isSimple ? 'noEqualsNull' : 'noEqualsNullComplex')
          : (isSimple ? 'noEqualsUndefined' : 'noEqualsUndefinedComplex');

        context.report({
          node,
          messageId,
          data: isSimple ? { identifier: valueText } : {},
          fix(fixer) {
            return buildFix(fixer, node, `!isValueDefined(${valueText})`);
          },
        });
      }
    }

    return {
      BinaryExpression: checkBinaryExpression,
    };
  },
};

/**
 * Export the plugin
 */
export default {
  rules: {
    'no-null-check': noNullCheckRule,
  },
};
