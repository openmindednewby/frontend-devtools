import { isDocBlock, isTypeAnnotationDoc } from './comment-utils.js';

const EXPORT_TYPES = new Set([
  'ExportNamedDeclaration',
  'ExportDefaultDeclaration',
  'ExportAllDeclaration',
  'TSExportAssignment',
]);

const PASS_THROUGH = new Set([
  'MethodDefinition',
  'PropertyDefinition',
  'AccessorProperty',
  'TSAbstractMethodDefinition',
  'TSAbstractPropertyDefinition',
  'TSAbstractAccessorProperty',
  'TSIndexSignature',
  'ClassBody',
  'ClassDeclaration',
  'ClassExpression',
  'TSInterfaceBody',
  'TSInterfaceDeclaration',
  'TSPropertySignature',
  'TSMethodSignature',
  'TSTypeLiteral',
  'TSTypeAnnotation',
  'TSTypeAliasDeclaration',
  'TSIntersectionType',
  'TSUnionType',
  'TSEnumDeclaration',
  'TSEnumBody',
  'TSEnumMember',
  'TSModuleBlock',
  'TSModuleDeclaration',
  'TSDeclareFunction',
  'VariableDeclaration',
  'VariableDeclarator',
  'ObjectExpression',
  'Property',
  'TSAsExpression',
  'TSSatisfiesExpression',
]);

const HIDDEN_ACCESSIBILITY = new Set(['private', 'protected']);

function isHiddenMember(node) {
  if (HIDDEN_ACCESSIBILITY.has(node.accessibility)) return true;

  return node.key?.type === 'PrivateIdentifier';
}

function isAmbientModule(node) {
  return node.type === 'TSModuleDeclaration' && (node.declare === true || node.global === true);
}

function isNamed(node, name) {
  return node?.type === 'Identifier' && node.name === name;
}

function isCommonJsExport(node) {
  if (node.type !== 'ExpressionStatement') return false;
  const expr = node.expression;
  if (expr.type !== 'AssignmentExpression' || expr.left.type !== 'MemberExpression') return false;
  const target = expr.left.object;
  const isModuleExports = isNamed(target, 'module') && isNamed(expr.left.property, 'exports');
  const isModuleExportsMember =
    target.type === 'MemberExpression' && isNamed(target.object, 'module') && isNamed(target.property, 'exports');

  return isNamed(target, 'exports') || isModuleExports || isModuleExportsMember;
}

function declaredNames(node) {
  if (node.type === 'VariableDeclaration')
    return node.declarations.filter((d) => d.id.type === 'Identifier').map((d) => d.id.name);
  if (node.id?.type === 'Identifier') return [node.id.name];

  return [];
}

function collectExportedNames(program) {
  const names = new Set();
  for (const statement of program.body) {
    if (statement.type === 'ExportNamedDeclaration' && !statement.source)
      for (const spec of statement.specifiers) if (spec.local.type === 'Identifier') names.add(spec.local.name);
    if (statement.type === 'ExportDefaultDeclaration' && statement.declaration.type === 'Identifier')
      names.add(statement.declaration.name);
    if (statement.type === 'TSExportAssignment' && statement.expression.type === 'Identifier')
      names.add(statement.expression.name);
  }

  return names;
}

function isTopLevelPublic(node, exportedNames) {
  if (EXPORT_TYPES.has(node.type) || isAmbientModule(node) || isCommonJsExport(node)) return true;

  return declaredNames(node).some((name) => exportedNames.has(name));
}

function isPublic(start, exportedNames) {
  let current = start;
  while (current.parent && current.parent.type !== 'Program') {
    if (isHiddenMember(current)) return false;
    const parent = current.parent;
    if (EXPORT_TYPES.has(parent.type) || isAmbientModule(parent)) return true;
    if (!PASS_THROUGH.has(parent.type)) return false;
    current = parent;
  }
  if (isHiddenMember(current)) return false;

  return isTopLevelPublic(current, exportedNames);
}

function documentedNode(sourceCode, comment) {
  const token = sourceCode.getTokenAfter(comment, { includeComments: false });
  if (!token) return null;
  let node = sourceCode.getNodeByRangeIndex(token.range[0]);
  while (node?.parent && node.parent.type !== 'Program' && node.parent.range[0] === node.range[0])
    node = node.parent;

  return node && node.type !== 'Program' ? node : null;
}

const docCommentPublicOnlyRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Allow a doc comment only on an exported declaration or a public member of one (RV-1)',
    },
    schema: [],
    messages: {
      notPublic:
        'RV-1: a doc comment is allowed only on an exported declaration or a public member of one. Move the intent into the name.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();

    return {
      Program(program) {
        const exportedNames = collectExportedNames(program);
        for (const comment of sourceCode.getAllComments()) {
          if (!isDocBlock(comment) || isTypeAnnotationDoc(comment)) continue;
          const node = documentedNode(sourceCode, comment);
          if (node && isPublic(node, exportedNames)) continue;
          context.report({ loc: comment.loc, messageId: 'notPublic' });
        }
      },
    };
  },
};

export default { rules: { 'doc-comment-public-only': docCommentPublicOnlyRule } };
