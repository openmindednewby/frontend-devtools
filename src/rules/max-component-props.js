const DEFAULT_MAX = 12;
const PROPS_NAME = /Props$/;
const COMPONENT_NAME = /^[A-Z]/;
const COMPONENT_WRAPPERS = new Set(['forwardRef', 'memo']);
const MEMBER_TYPES = new Set(['TSPropertySignature', 'TSMethodSignature']);
const FUNCTION_TYPES = new Set(['ArrowFunctionExpression', 'FunctionExpression']);

function memberNames(members) {
  const names = new Set();
  for (const member of members) {
    if (!MEMBER_TYPES.has(member.type)) continue;
    const name = member.key?.name ?? member.key?.value;
    if (name !== undefined) names.add(String(name));
  }
  return names;
}

function mergeInto(target, source) {
  for (const name of source) target.add(name);
  return target;
}

function namesOfReference(name, declarations, seen) {
  const declaration = declarations.get(name);
  if (!declaration || seen.has(name)) return new Set();
  seen.add(name);
  return namesOfDeclaration(declaration, declarations, seen);
}

function namesOfType(type, declarations, seen) {
  if (type.type === 'TSTypeLiteral') return memberNames(type.members);
  if (type.type === 'TSIntersectionType') {
    return type.types.reduce(
      (all, part) => mergeInto(all, namesOfType(part, declarations, seen)),
      new Set(),
    );
  }
  if (type.type === 'TSUnionType') {
    return type.types.reduce((largest, part) => {
      const names = namesOfType(part, declarations, new Set(seen));
      return names.size > largest.size ? names : largest;
    }, new Set());
  }
  if (type.type === 'TSTypeReference' && type.typeName.type === 'Identifier') {
    return namesOfReference(type.typeName.name, declarations, seen);
  }
  return new Set();
}

function namesOfDeclaration(declaration, declarations, seen) {
  if (declaration.type === 'TSTypeAliasDeclaration') {
    return namesOfType(declaration.typeAnnotation, declarations, seen);
  }
  const names = memberNames(declaration.body.body);
  for (const parent of declaration.extends ?? []) {
    if (parent.expression.type === 'Identifier') {
      mergeInto(names, namesOfReference(parent.expression.name, declarations, seen));
    }
  }
  return names;
}

function collectDeclarations(program) {
  const declarations = new Map();
  for (const statement of program.body) {
    const node = statement.type === 'ExportNamedDeclaration' ? statement.declaration : statement;
    if (node?.type === 'TSInterfaceDeclaration' || node?.type === 'TSTypeAliasDeclaration') {
      declarations.set(node.id.name, node);
    }
  }
  return declarations;
}

function wrappedFunction(init) {
  if (!init) return undefined;
  if (FUNCTION_TYPES.has(init.type)) return init;
  if (init.type !== 'CallExpression') return undefined;
  const callee = init.callee.type === 'MemberExpression' ? init.callee.property : init.callee;
  return COMPONENT_WRAPPERS.has(callee.name) ? wrappedFunction(init.arguments[0]) : undefined;
}

function propsAnnotation(fn) {
  return fn?.params[0]?.typeAnnotation?.typeAnnotation;
}

const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'UI-COMPOSE-1: a component declares at most the capped number of props; split it or compose with slots. Frozen names may only shrink.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'integer', minimum: 0 },
          frozen: { type: 'object', additionalProperties: { type: 'integer', minimum: 0 } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooMany: '{{name}} declares {{count}} props; the cap is {{max}}. Split it or compose with slots (UI-COMPOSE-1).',
      frozenGrew: '{{name}} is frozen at {{max}} props and now declares {{count}}. A frozen component may only shrink (UI-COMPOSE-1).',
    },
  },
  create(context) {
    const options = context.options[0] ?? {};
    const max = options.max ?? DEFAULT_MAX;
    const frozen = options.frozen ?? {};
    let declarations = new Map();
    const reported = new Set();

    function check(node, name, names) {
      if (reported.has(name)) return;
      reported.add(name);
      const allowed = frozen[name] ?? max;
      if (names.size <= allowed) return;
      const messageId = frozen[name] === undefined ? 'tooMany' : 'frozenGrew';
      context.report({ node, messageId, data: { name, count: names.size, max: allowed } });
    }

    function checkDeclaration(declaration) {
      const name = declaration.id.name;
      check(declaration, name, namesOfDeclaration(declaration, declarations, new Set([name])));
    }

    function checkComponent(id, fn) {
      if (!id || !COMPONENT_NAME.test(id.name)) return;
      const annotation = propsAnnotation(fn);
      if (annotation?.type === 'TSTypeLiteral') {
        check(annotation, id.name, memberNames(annotation.members));
        return;
      }
      if (annotation?.type !== 'TSTypeReference' || annotation.typeName.type !== 'Identifier') return;
      const declaration = declarations.get(annotation.typeName.name);
      if (declaration) checkDeclaration(declaration);
    }

    return {
      Program(program) {
        declarations = collectDeclarations(program);
        for (const [name, declaration] of declarations) {
          if (PROPS_NAME.test(name)) checkDeclaration(declaration);
        }
      },
      FunctionDeclaration(node) {
        checkComponent(node.id, node);
      },
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier') checkComponent(node.id, wrappedFunction(node.init));
      },
    };
  },
};

export default { rules: { 'max-component-props': rule } };
