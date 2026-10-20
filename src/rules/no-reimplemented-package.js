import { REIMPLEMENTED_PACKAGE_REGISTRY } from './reimplemented-packages-registry.js';

const TEST_FILE = /(?:\.(?:test|spec)\.[cm]?[jt]sx?$)|(?:\/__tests__\/)|(?:\/e2e\/)/;
const SHARED_SOURCE = /\/(?:NpmPackages\/packages|node_modules)\//;

function normalisePath(filename) {
  return typeof filename === 'string' ? filename.split('\\').join('/') : '';
}

function isExemptFile(path, allow) {
  if (!path.includes('/src/')) return true;
  if (TEST_FILE.test(path) || SHARED_SOURCE.test(path)) return true;
  return allow.some((fragment) => path.includes(fragment));
}

const MODULE_DECLARATIONS = new Set(['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration']);

function usesPackage(program, packageName) {
  return program.body.some((statement) => {
    if (!MODULE_DECLARATIONS.has(statement.type) || statement.source == null) return false;
    const source = statement.source.value;
    return source === packageName || (typeof source === 'string' && source.startsWith(`${packageName}/`));
  });
}

function literalText(node) {
  if (node.type === 'Literal') return typeof node.value === 'string' ? node.value : '';
  return node.quasis.length === 1 ? node.quasis[0].value.cooked ?? '' : '';
}

const noReimplementedPackageRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Flag app code that re-implements a capability a shared @dloizides package already provides.',
      recommended: false,
    },
    schema: [
      {
        type: 'object',
        properties: { allow: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      reimplemented: 'This re-implements {{package}} ({{id}}). Use {{use}} from {{package}} instead (QUAL-ADOPT-1).',
    },
  },

  create(context) {
    const options = context.options[0] ?? {};
    const path = normalisePath(context.filename ?? context.getFilename());
    if (isExemptFile(path, options.allow ?? [])) return {};

    const reported = new Set();
    const report = (node, entry) => {
      if (reported.has(entry.id)) return;
      reported.add(entry.id);
      context.report({ node, messageId: 'reimplemented', data: { id: entry.id, package: entry.package, use: entry.use } });
    };
    const checkLiteral = (node) => {
      const text = literalText(node);
      if (text === '') return;
      for (const entry of REIMPLEMENTED_PACKAGE_REGISTRY)
        if (entry.literals.some((pattern) => pattern.test(text))) report(node, entry);
    };

    return {
      Program(node) {
        for (const entry of REIMPLEMENTED_PACKAGE_REGISTRY)
          if (entry.paths.some((pattern) => pattern.test(path)) && !usesPackage(node, entry.package)) report(node, entry);
      },
      Literal: checkLiteral,
      TemplateLiteral: checkLiteral,
    };
  },
};

export default {
  rules: {
    'no-reimplemented-package': noReimplementedPackageRule,
  },
};
