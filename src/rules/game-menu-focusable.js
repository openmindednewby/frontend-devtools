const POINTER_EVENTS = new Set(['click', 'pointerdown', 'pointerup']);
const NON_FOCUSABLE_TAGS = new Set(['div', 'span', 'li', 'img']);
const FOCUS_ATTRIBUTES = new Set(['tabindex', 'role']);
const FOCUS_PROPERTIES = new Set(['tabIndex', 'role']);
const KEYDOWN = 'keydown';

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

function unwrap(node) {
  let current = node;
  while (current && (current.type === 'TSAsExpression' || current.type === 'TSNonNullExpression' || current.type === 'TSTypeAssertion')) {
    current = current.expression;
  }
  return current;
}

function stringValue(node) {
  const target = unwrap(node);
  if (!target) return undefined;
  if (target.type === 'Literal' && typeof target.value === 'string') return target.value;
  if (target.type === 'TemplateLiteral' && target.expressions.length === 0) return target.quasis[0].value.cooked;
  return undefined;
}

function propertyName(member) {
  if (member.computed) return stringValue(member.property);
  return member.property.type === 'Identifier' ? member.property.name : undefined;
}

function createdTag(init) {
  const call = unwrap(init);
  if (!call || call.type !== 'CallExpression') return undefined;
  if (call.callee.type !== 'MemberExpression' || propertyName(call.callee) !== 'createElement') return undefined;
  const tag = stringValue(call.arguments[0]);
  return tag === undefined ? undefined : tag.toLowerCase();
}

function nonFocusableTag(variable) {
  const initializers = variable.defs
    .filter((def) => def.node.type === 'VariableDeclarator')
    .map((def) => def.node.init);
  const assigned = variable.references
    .filter((ref) => ref.isWrite() && ref.writeExpr)
    .map((ref) => ref.writeExpr);
  return [...initializers, ...assigned].map(createdTag).find((tag) => NON_FOCUSABLE_TAGS.has(tag ?? ''));
}

function setsFocusAttribute(reference) {
  const member = reference.identifier.parent;
  if (!member || member.type !== 'MemberExpression' || member.object !== reference.identifier) return false;
  const name = propertyName(member);
  const outer = member.parent;
  if (FOCUS_PROPERTIES.has(name ?? '')) return outer.type === 'AssignmentExpression' && outer.left === member;
  if (name !== 'setAttribute' || outer.type !== 'CallExpression' || outer.callee !== member) return false;
  return FOCUS_ATTRIBUTES.has((stringValue(outer.arguments[0]) ?? '').toLowerCase());
}

function unfocusableTag(context, node, identifier) {
  if (!identifier || identifier.type !== 'Identifier') return undefined;
  const variable = findVariable(getScopeFor(context, node), identifier.name);
  if (!variable || variable.references.some(setsFocusAttribute)) return undefined;
  return nonFocusableTag(variable);
}

function resolveHandler(context, node, handler) {
  const target = unwrap(handler);
  if (!target) return undefined;
  if (target.type === 'ArrowFunctionExpression' || target.type === 'FunctionExpression') return target;
  if (target.type !== 'Identifier') return undefined;
  const variable = findVariable(getScopeFor(context, node), target.name);
  const def = variable && variable.defs[0];
  if (!def) return undefined;
  if (def.node.type === 'FunctionDeclaration') return def.node;
  if (def.node.type === 'VariableDeclarator') return resolveHandler(context, node, def.node.init);
  return undefined;
}

function stopPropagationCalls(fn) {
  const found = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (node !== fn && node.type.includes('Function')) return;
    const isStop = node.type === 'CallExpression' && node.callee.type === 'MemberExpression' && propertyName(node.callee) === 'stopPropagation';
    if (isStop) found.push(node);
    for (const key of Object.keys(node)) {
      if (key === 'parent') continue;
      const child = node[key];
      if (Array.isArray(child)) child.forEach(visit);
      else if (child && typeof child === 'object') visit(child);
    }
  };
  visit(fn.body);
  return found;
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Game menus stay walkable with arrow keys and a controller: no pointer-only div/span/li/img items, no keydown stopPropagation.',
    },
    schema: [],
    messages: {
      pointerOnlyItem: "'{{name}}' is a <{{tag}}> with a {{event}} handler but no tabindex or role: keyboard and controller users cannot reach it. Use a <button>, or set tabIndex and role.",
      keydownStopPropagation: 'A keydown handler calls stopPropagation(), which hides keys from every other listener. If it is needed, disable this line with the reason.',
    },
  },
  create(context) {
    const reportPointerOnly = (node, identifier, event) => {
      const tag = unfocusableTag(context, node, identifier);
      if (tag === undefined) return;
      context.report({ node, messageId: 'pointerOnlyItem', data: { name: identifier.name, tag, event } });
    };
    const reportKeydown = (node, handler) => {
      const fn = resolveHandler(context, node, handler);
      if (!fn) return;
      stopPropagationCalls(fn).forEach((call) => context.report({ node: call, messageId: 'keydownStopPropagation' }));
    };
    return {
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression' || propertyName(node.callee) !== 'addEventListener') return;
        const event = stringValue(node.arguments[0]);
        if (event === KEYDOWN) reportKeydown(node, node.arguments[1]);
        else if (POINTER_EVENTS.has(event ?? '')) reportPointerOnly(node, node.callee.object, event);
      },
      AssignmentExpression(node) {
        if (node.left.type !== 'MemberExpression') return;
        const name = propertyName(node.left);
        if (name === 'onclick') reportPointerOnly(node, node.left.object, 'onclick');
        else if (name === 'onkeydown') reportKeydown(node, node.right);
      },
    };
  },
};

export default { rules: { 'game-menu-focusable': rule } };
