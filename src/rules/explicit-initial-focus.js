const DEFAULT_MIN_CONTROLS = 2;
const DEFAULT_DIALOG_PATTERN = '(Dialog|Modal)$';
const MENU_DEFAULT_IDENTIFIER = 'MENU_DEFAULT_ATTR';
const MENU_DEFAULT_TEXT = 'data-menu-default';
const MENU_DEFAULT_DATASET_KEY = 'menuDefault';
const FOCUS_METHOD = 'focus';
const FOCUS_PROP_NAMES = new Set(['autoFocus', 'initialFocus', 'initialFocusRef', MENU_DEFAULT_TEXT]);
const FOCUS_OPTION_KEYS = new Set(['initialFocus', 'initialFocusRef', 'autoFocus']);
const DIALOG_ROLE_PROPS = new Set(['role', 'accessibilityRole']);
const BUTTON_TAG = /<button\b/gi;

function propertyName(member) {
  if (!member.computed && member.property.type === 'Identifier') return member.property.name;
  const prop = member.property;
  return prop.type === 'Literal' && typeof prop.value === 'string' ? prop.value : undefined;
}

function keyName(key) {
  if (key.type === 'Identifier') return key.name;
  return key.type === 'Literal' && typeof key.value === 'string' ? key.value : undefined;
}

function jsxName(name) {
  if (name.type === 'JSXIdentifier') return name.name;
  if (name.type === 'JSXMemberExpression') return name.property.name;
  if (name.type === 'JSXNamespacedName') return `${name.namespace.name}:${name.name.name}`;
  return undefined;
}

function attributeText(attr) {
  const value = attr.value;
  if (!value) return undefined;
  if (value.type === 'Literal' && typeof value.value === 'string') return value.value;
  const inner = value.type === 'JSXExpressionContainer' ? value.expression : undefined;
  return inner && inner.type === 'Literal' && typeof inner.value === 'string' ? inner.value : undefined;
}

function isDialogRole(attr) {
  if (attr.type !== 'JSXAttribute' || !DIALOG_ROLE_PROPS.has(jsxName(attr.name) ?? '')) return false;
  return attributeText(attr) === 'dialog';
}

function readOptions(context) {
  const options = context.options[0] ?? {};
  return {
    minControls: options.minControls ?? DEFAULT_MIN_CONTROLS,
    dialogPattern: new RegExp(options.dialogPattern ?? DEFAULT_DIALOG_PATTERN),
    selfFocusing: new Set(options.selfFocusing ?? []),
  };
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'FOCUS-1: a game menu or a dialog names the control focused on open (data-menu-default, autoFocus, initialFocus or a ref focus), never the first element by default.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          minControls: { type: 'integer', minimum: 1 },
          dialogPattern: { type: 'string' },
          selfFocusing: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingMenuDefault: 'This file builds a menu of {{count}} buttons but names no initial focus. Mark the primary next step with MENU_DEFAULT_ATTR (data-menu-default) or pass initialFocus; never a destructive action.',
      missingDialogFocus: "'{{name}}' opens a dialog but the file names no initial focus. Give the primary next step autoFocus, an initialFocus prop or a ref focus on mount; never a destructive action.",
    },
  },
  create(context) {
    const options = readOptions(context);
    let named = false;
    let controlCount = 0;
    let firstControl;
    const dialogs = [];
    const countControls = (node, text) => {
      const found = (text.match(BUTTON_TAG) ?? []).length;
      if (found === 0) return;
      controlCount += found;
      firstControl ??= node;
    };
    const scanText = (node, text) => {
      if (text.includes(MENU_DEFAULT_TEXT)) named = true;
      countControls(node, text);
    };
    return {
      Identifier(node) {
        if (node.name === MENU_DEFAULT_IDENTIFIER) named = true;
      },
      Literal(node) {
        if (typeof node.value === 'string' && node.parent.type !== 'JSXAttribute') scanText(node, node.value);
      },
      TemplateElement(node) {
        scanText(node, node.value.cooked ?? node.value.raw);
      },
      MemberExpression(node) {
        if (propertyName(node) === MENU_DEFAULT_DATASET_KEY) named = true;
      },
      Property(node) {
        if (FOCUS_OPTION_KEYS.has(keyName(node.key) ?? '')) named = true;
      },
      CallExpression(node) {
        if (node.callee.type !== 'MemberExpression') return;
        const name = propertyName(node.callee);
        if (name === FOCUS_METHOD) named = true;
        const tag = node.arguments[0];
        const isButton = name === 'createElement' && tag && tag.type === 'Literal' && String(tag.value).toLowerCase() === 'button';
        if (isButton) countControls(node, '<button');
      },
      JSXAttribute(node) {
        if (FOCUS_PROP_NAMES.has(jsxName(node.name) ?? '')) named = true;
      },
      JSXOpeningElement(node) {
        const name = jsxName(node.name) ?? '';
        if (options.selfFocusing.has(name)) return;
        const isDialog = options.dialogPattern.test(name) || node.attributes.some(isDialogRole);
        if (isDialog) dialogs.push({ node, name });
      },
      'Program:exit'() {
        if (named) return;
        if (controlCount >= options.minControls) context.report({ node: firstControl, messageId: 'missingMenuDefault', data: { count: String(controlCount) } });
        dialogs.forEach(({ node, name }) => context.report({ node, messageId: 'missingDialogFocus', data: { name } }));
      },
    };
  },
};

export default { rules: { 'explicit-initial-focus': rule } };
