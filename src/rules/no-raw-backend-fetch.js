const DEFAULT_ALLOWED_PATH_FRAGMENTS = [
  '/src/server/',
  '/src/http/',
  '/src/lib/http/',
  '/generated/',
  '/app/+html.',
  'service-worker',
  'serviceWorker',
  '/sw.',
];

const CLIENT_PACKAGE_PATH = /\/packages\/[^/]+-client\//;
const TEST_FILE = /(?:\.(?:test|spec)\.[cm]?[jt]sx?$)|(?:\/__tests__\/)/;
const EXEMPT_URL_SCHEME = /^\s*(?:data|blob):/i;
const ABSOLUTE_HTTP_URL = /^https?:\/\/[^/\s]+\//i;
const ABSOLUTE_HTTP_LITERAL = /^https?:\/\/[^/\s]+(?:[/?#]|$)/i;
const URL_OBJECTS = new Set(['URL', 'webkitURL']);
const GLOBAL_OBJECTS = new Set(['window', 'globalThis', 'self']);
const AXIOS_MODULE = 'axios';

function normalisePath(filename) {
  return typeof filename === 'string' ? filename.split('\\').join('/') : '';
}

function isExemptFile(filename, allow) {
  const path = normalisePath(filename);
  if (!path.includes('/src/')) return true;
  if (TEST_FILE.test(path)) return true;
  if (CLIENT_PACKAGE_PATH.test(path)) return true;
  return [...DEFAULT_ALLOWED_PATH_FRAGMENTS, ...allow].some((fragment) => path.includes(fragment));
}

function isFetchCallee(callee) {
  if (callee.type === 'Identifier') return callee.name === 'fetch';
  if (callee.type !== 'MemberExpression' || callee.computed) return false;
  const isFetchProperty = callee.property.type === 'Identifier' && callee.property.name === 'fetch';
  const isGlobalObject = callee.object.type === 'Identifier' && GLOBAL_OBJECTS.has(callee.object.name);
  return isFetchProperty && isGlobalObject;
}

function leadingText(node) {
  if (node === undefined) return '';
  if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node.type === 'TemplateLiteral') return node.quasis[0].value.cooked ?? '';
  return '';
}

function isDataOrBlobUrl(node) {
  return EXEMPT_URL_SCHEME.test(leadingText(node));
}

function isThirdPartyLiteralUrl(node) {
  if (node === undefined) return false;
  if (node.type === 'Literal') return typeof node.value === 'string' && ABSOLUTE_HTTP_LITERAL.test(node.value);
  if (node.type !== 'TemplateLiteral') return false;
  const head = node.quasis[0].value.cooked ?? '';
  return node.expressions.length === 0 ? ABSOLUTE_HTTP_LITERAL.test(head) : ABSOLUTE_HTTP_URL.test(head);
}

function unwrapExpression(node) {
  let current = node;
  while (current !== undefined && current !== null && ['TSAsExpression', 'TSNonNullExpression', 'TSTypeAssertion', 'TSSatisfiesExpression'].includes(current.type))
    current = current.expression;
  return current;
}

function memberName(node) {
  return node.type === 'MemberExpression' && !node.computed && node.property.type === 'Identifier' ? node.property.name : '';
}

function isUrlObject(node) {
  if (node.type === 'Identifier') return URL_OBJECTS.has(node.name);
  return memberName(node) !== '' && URL_OBJECTS.has(memberName(node)) && node.object.type === 'Identifier' && GLOBAL_OBJECTS.has(node.object.name);
}

function isCreateObjectUrlCall(node) {
  if (node === undefined || node === null || node.type !== 'CallExpression') return false;
  return memberName(node.callee) === 'createObjectURL' && isUrlObject(node.callee.object);
}

function constInitOf(identifier, scope) {
  let current = scope;
  while (current !== null) {
    const variable = current.set.get(identifier.name);
    if (variable !== undefined) {
      const def = variable.defs.length === 1 ? variable.defs[0] : undefined;
      const isConst = def !== undefined && def.type === 'Variable' && def.parent.kind === 'const';
      return isConst ? unwrapExpression(def.node.init) : undefined;
    }
    current = current.upper;
  }
  return undefined;
}

function isNewFileReader(node) {
  return node !== undefined && node !== null && node.type === 'NewExpression' && node.callee.type === 'Identifier' && node.callee.name === 'FileReader';
}

function isFileReaderResult(node, scope) {
  if (node === undefined || node === null || memberName(node) !== 'result') return false;
  const object = unwrapExpression(node.object);
  if (isNewFileReader(object)) return true;
  return object.type === 'Identifier' && isNewFileReader(constInitOf(object, scope));
}

function isLocalObjectUrl(node, scope) {
  const target = unwrapExpression(node);
  if (target === undefined || target === null) return false;
  if (isCreateObjectUrlCall(target) || isFileReaderResult(target, scope)) return true;
  if (target.type !== 'Identifier') return false;
  const init = constInitOf(target, scope);
  return isCreateObjectUrlCall(init) || isFileReaderResult(init, scope);
}

function scopeOf(context, node) {
  const sourceCode = context.sourceCode ?? context.getSourceCode();
  return typeof sourceCode.getScope === 'function' ? sourceCode.getScope(node) : context.getScope();
}

function isExemptFetchTarget(context, node) {
  const target = node.arguments[0];
  if (isDataOrBlobUrl(target) || isThirdPartyLiteralUrl(target)) return true;
  return isLocalObjectUrl(target, scopeOf(context, node));
}

function isAxiosSource(node) {
  return node !== undefined && node.type === 'Literal' && node.value === AXIOS_MODULE;
}

function isTypeOnlyImport(node) {
  if (node.importKind === 'type') return true;
  const hasSpecifiers = node.specifiers.length > 0;
  return hasSpecifiers && node.specifiers.every((specifier) => specifier.importKind === 'type');
}

const noRawBackendFetchRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'PAT-API-1: web apps call the backend only through the shared client or generated hooks, never raw fetch() or axios in app code.',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          allow: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      rawFetch:
        'Raw fetch() in app code (PAT-API-1). Call the backend through the shared client or a generated API hook; only src/server/, src/http/, *-client packages, generated code and the service worker may call fetch.',
      rawAxios:
        'axios imported in app code (PAT-API-1). Use the shared client or a generated API hook; only src/server/, src/http/, *-client packages and generated code may import axios.',
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const allow = Array.isArray(options.allow) ? options.allow : [];
    const filename = context.filename ?? context.getFilename();
    if (isExemptFile(filename, allow)) return {};
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    if (sourceCode.ast === undefined || sourceCode.ast.type !== 'Program') return {};

    return {
      CallExpression(node) {
        if (isFetchCallee(node.callee)) {
          if (!isExemptFetchTarget(context, node)) context.report({ node, messageId: 'rawFetch' });
          return;
        }
        const isRequire = node.callee.type === 'Identifier' && node.callee.name === 'require';
        if (isRequire && isAxiosSource(node.arguments[0])) context.report({ node, messageId: 'rawAxios' });
      },
      ImportExpression(node) {
        if (isAxiosSource(node.source)) context.report({ node, messageId: 'rawAxios' });
      },
      ImportDeclaration(node) {
        if (isAxiosSource(node.source) && !isTypeOnlyImport(node)) context.report({ node, messageId: 'rawAxios' });
      },
    };
  },
};

export default {
  rules: {
    'no-raw-backend-fetch': noRawBackendFetchRule,
  },
};
