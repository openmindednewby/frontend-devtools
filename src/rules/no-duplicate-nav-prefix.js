/**
 * Custom ESLint Plugin: No Duplicate Nav Route/Key
 *
 * Ensures every sidebar nav item within a module has a unique `route` and `key`.
 * Duplicate routes cause multiple sidebar items to navigate to the same path,
 * and duplicate keys cause rendering/highlighting issues.
 *
 * Scoped to module definition files: packages/[module]/src/index.ts
 */

/**
 * @param {string} propName
 * @param {string} messageId
 */
function createDuplicateChecker(propName, messageId) {
  return {
    /** @param {import('estree').ArrayExpression} node */
    check(node, context) {
      const objectsWithProp = node.elements.filter(
        (el) =>
          el &&
          el.type === 'ObjectExpression' &&
          el.properties.some(
            (p) =>
              p.type === 'Property' &&
              p.key.type === 'Identifier' &&
              p.key.name === propName,
          ),
      );

      if (objectsWithProp.length === 0) return;

      /** @type {Map<string, import('estree').Property>} */
      const seen = new Map();

      for (const obj of objectsWithProp) {
        const prop = obj.properties.find(
          (p) =>
            p.type === 'Property' &&
            p.key.type === 'Identifier' &&
            p.key.name === propName,
        );
        if (!prop) continue;

        let value;
        if (prop.value.type === 'Literal') {
          value = String(prop.value.value);
        } else if (prop.value.type === 'MemberExpression') {
          const src = context.sourceCode || context.getSourceCode();
          value = src.getText(prop.value);
        } else if (prop.value.type === 'TemplateLiteral' && prop.value.quasis.length === 1) {
          value = prop.value.quasis[0].value.cooked;
        } else {
          continue;
        }

        if (seen.has(value)) {
          context.report({
            node: prop.value,
            messageId,
            data: { value },
          });
        } else {
          seen.set(value, prop);
        }
      }
    },
  };
}

const noDuplicateNavPrefixRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow duplicate route or key values in module sidebarItems. ' +
        'Duplicate routes cause navigation collisions; duplicate keys cause rendering issues.',
      category: 'Possible Errors',
      recommended: true,
    },
    schema: [],
    messages: {
      duplicateRoute:
        'Duplicate route "{{value}}" - each sidebar item must have a unique route.',
      duplicateKey:
        'Duplicate key "{{value}}" - each sidebar item must have a unique key.',
    },
  },

  create(context) {
    const routeChecker = createDuplicateChecker('route', 'duplicateRoute');
    const keyChecker = createDuplicateChecker('key', 'duplicateKey');

    return {
      ArrayExpression(node) {
        routeChecker.check(node, context);
        keyChecker.check(node, context);
      },
    };
  },
};

export default {
  rules: {
    'no-duplicate-nav-prefix': noDuplicateNavPrefixRule,
  },
};
