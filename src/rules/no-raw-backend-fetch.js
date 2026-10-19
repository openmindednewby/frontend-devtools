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

    return {
      CallExpression(node) {
        if (isFetchCallee(node.callee)) {
          if (!isDataOrBlobUrl(node.arguments[0])) context.report({ node, messageId: 'rawFetch' });
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
