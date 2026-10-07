const UI_BUTTONS_MODULE = '@dloizides/ui-buttons';
const GROUP_NAME = 'RowActionGroup';
const ACTIONS_PROP = 'actions';
const SPEC_TYPE = 'RowActionSpec';
const MEMO_HOOKS = new Set(['useMemo', 'useCallback']);
const MAX_DEPTH = 8;

const Source = Object.freeze({ LOCAL: 'local', EXTERNAL: 'external' });

function getScopeFor(context, node) {
  const sourceCode = context.sourceCode ?? context.getSourceCode();
  if (typeof sourceCode.getScope === 'function') return sourceCode.getScope(node);
  return context.getScope();
}

function findVariable(scope, name) {
  let current = scope;
  while (current) {
    const found = current.set.get(name);
    if (found) return found;
    current = current.upper;
  }
  return undefined;
}

function rootIdentifier(node) {
  let current = node;
  while (current && current.type === 'MemberExpression') current = current.object;
  return current && current.type === 'Identifier' ? current : undefined;
}

function calleeName(callee) {
  if (callee.type === 'Identifier') return callee.name;
  if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') return callee.property.name;
  return undefined;
}

function isSpecArrayType(annotation) {
  const type = annotation && annotation.typeAnnotation;
  if (!type) return false;
  const isSpecRef = (ref) => ref && ref.type === 'TSTypeReference' && ref.typeName.name === SPEC_TYPE;
  if (type.type === 'TSArrayType') return isSpecRef(type.elementType);
  if (type.type === 'TSTypeOperator') return type.typeAnnotation.type === 'TSArrayType' && isSpecRef(type.typeAnnotation.elementType);
  const params = type.typeParameters && type.typeParameters.params;
  return type.type === 'TSTypeReference' && params !== undefined && params.some(isSpecRef);
}

function returnedExpressions(fn) {
  if (fn.body.type !== 'BlockStatement') return [fn.body];
  const found = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node.type === 'ReturnStatement') {
      if (node.argument) found.push(node.argument);
      return;
    }
    if (node.type.includes('Function')) return;
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child.type === 'string') visit(child);
    }
  };
  fn.body.body.forEach(visit);
  return found;
}

function isFunctionNode(node) {
  return node && (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression' || node.type === 'FunctionDeclaration');
}

function createClassifier(context) {
  const anyLocal = (nodes, depth, seen) => nodes.some((n) => classify(n, depth, seen) === Source.LOCAL);

  function classifyVariable(variable, depth, seen) {
    if (seen.has(variable)) return Source.EXTERNAL;
    seen.add(variable);
    const def = variable.defs[0];
    if (!def) return Source.EXTERNAL;
    if (def.type === 'ImportBinding' || def.type === 'Parameter') return Source.EXTERNAL;
    if (def.type === 'FunctionName') return Source.LOCAL;
    if (def.type !== 'Variable' || def.node.id.type !== 'Identifier') return Source.EXTERNAL;
    const writes = variable.references.filter((ref) => ref.isWrite() && ref.writeExpr).map((ref) => ref.writeExpr);
    if (writes.length === 0) return isSpecArrayType(def.node.id.typeAnnotation) ? Source.LOCAL : Source.EXTERNAL;
    return anyLocal(writes, depth + 1, seen) ? Source.LOCAL : Source.EXTERNAL;
  }

  function classifyCall(node, depth, seen) {
    const name = calleeName(node.callee);
    if (MEMO_HOOKS.has(name) && isFunctionNode(node.arguments[0])) {
      return anyLocal(returnedExpressions(node.arguments[0]), depth + 1, seen) ? Source.LOCAL : Source.EXTERNAL;
    }
    const root = rootIdentifier(node.callee);
    if (!root) return Source.EXTERNAL;
    const variable = findVariable(getScopeFor(context, node), root.name);
    if (!variable || variable.defs.length === 0) return Source.EXTERNAL;
    const def = variable.defs[0];
    if (def.type === 'ImportBinding' || def.type === 'Parameter') return Source.EXTERNAL;
    if (def.type === 'FunctionName') return Source.LOCAL;
    const init = def.node.init;
    if (isFunctionNode(init)) return Source.LOCAL;
    return classifyVariable(variable, depth, seen);
  }

  function classify(node, depth, seen) {
    if (!node || depth > MAX_DEPTH) return Source.EXTERNAL;
    switch (node.type) {
      case 'ArrayExpression':
        return Source.LOCAL;
      case 'TSAsExpression':
      case 'TSSatisfiesExpression':
      case 'TSNonNullExpression':
        return classify(node.expression, depth + 1, seen);
      case 'ConditionalExpression':
        return anyLocal([node.consequent, node.alternate], depth + 1, seen) ? Source.LOCAL : Source.EXTERNAL;
      case 'LogicalExpression':
        return anyLocal([node.left, node.right], depth + 1, seen) ? Source.LOCAL : Source.EXTERNAL;
      case 'CallExpression':
        return classifyCall(node, depth, seen);
      case 'Identifier': {
        const variable = findVariable(getScopeFor(context, node), node.name);
        return variable ? classifyVariable(variable, depth, seen) : Source.EXTERNAL;
      }
      default:
        return Source.EXTERNAL;
    }
  }

  return (node) => classify(node, 0, new Set());
}

function groupNameMatcher(imports) {
  return (nameNode) => {
    if (nameNode.type === 'JSXIdentifier') return imports.named.has(nameNode.name);
    const isNamespaceMember = nameNode.type === 'JSXMemberExpression'
      && nameNode.object.type === 'JSXIdentifier'
      && imports.namespaces.has(nameNode.object.name);
    return isNamespaceMember && nameNode.property.name === GROUP_NAME;
  };
}

const singleRowActionSourceRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'RowActionGroup actions must come from a shared defineRowActions set, never a locally built array',
      recommended: true,
    },
    schema: [],
    messages: {
      localRowActions:
        'Build row actions once per entity with defineRowActions in a *RowActions module; tables may only omit with a reason.',
    },
  },
  create(context) {
    const imports = { named: new Set(), namespaces: new Set() };
    const isGroup = groupNameMatcher(imports);
    const classify = createClassifier(context);
    return {
      ImportDeclaration(node) {
        if (node.source.value !== UI_BUTTONS_MODULE) return;
        for (const spec of node.specifiers) {
          if (spec.type === 'ImportNamespaceSpecifier') imports.namespaces.add(spec.local.name);
          else if (spec.type === 'ImportSpecifier' && spec.imported.name === GROUP_NAME) imports.named.add(spec.local.name);
        }
      },
      JSXOpeningElement(node) {
        if (!isGroup(node.name)) return;
        const attr = node.attributes.find((a) => a.type === 'JSXAttribute' && a.name.name === ACTIONS_PROP);
        if (!attr || !attr.value || attr.value.type !== 'JSXExpressionContainer') return;
        if (classify(attr.value.expression) === Source.LOCAL) context.report({ node: attr, messageId: 'localRowActions' });
      },
    };
  },
};

export default {
  rules: {
    'single-row-action-source': singleRowActionSourceRule,
  },
};
