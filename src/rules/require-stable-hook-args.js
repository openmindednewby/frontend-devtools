/**
 * Custom ESLint Plugin: Require Stable Hook Arguments
 *
 * Detects functions, objects, and arrays declared in React component scope
 * that are passed as arguments to custom hooks (use*) without being wrapped
 * in useCallback or useMemo. These unstable references cause infinite
 * re-render loops when the hook uses them in useEffect dependency arrays.
 *
 * Examples:
 *   BAD:  const t = (key) => i18nT(key);
 *         useQuizForm(data, t);  // t is new ref every render
 *
 *   GOOD: const t = useCallback((key) => i18nT(key), [i18nT]);
 *         useQuizForm(data, t);  // t is stable
 *
 *   BAD:  const config = { theme: 'dark' };
 *         useMyHook(config);  // config is new ref every render
 *
 *   GOOD: const config = useMemo(() => ({ theme: 'dark' }), []);
 *         useMyHook(config);  // config is stable
 */

/**
 * Names of hooks/functions whose return values are considered stable
 * (don't need further wrapping in useCallback/useMemo).
 */
const STABLE_INIT_CALLS = new Set([
  'useCallback',
  'useMemo',
  'useRef',
  'useState',
  'useReducer',
  'useContext',
  'useId',
  'useDeferredValue',
  'useTransition',
  'useSyncExternalStore',
  'useActionState',
  'useFormStatus',
  'useOptimistic',
  'StyleSheet.create',
  'Object.freeze',
]);

/**
 * Hooks that should NOT trigger this rule. Includes:
 * - React built-in hooks
 * - Well-known library hooks that safely handle unstable references
 *   (they don't put callback arguments into useEffect dependency arrays)
 */
const IGNORED_HOOKS = new Set([
  // React built-in
  'useState',
  'useEffect',
  'useLayoutEffect',
  'useCallback',
  'useMemo',
  'useRef',
  'useReducer',
  'useContext',
  'useImperativeHandle',
  'useDebugValue',
  'useId',
  'useDeferredValue',
  'useTransition',
  'useSyncExternalStore',
  'useInsertionEffect',
  'useActionState',
  'useFormStatus',
  'useOptimistic',
  'use',
  // Redux - selector runs on every render by design
  'useSelector',
  'useDispatch',
  'useStore',
  // React Query / TanStack Query - callbacks are not deps
  'useQuery',
  'useMutation',
  'useInfiniteQuery',
  'useQueryClient',
  'useSuspenseQuery',
  'useSuspenseInfiniteQuery',
  'useQueries',
  'usePrefetchQuery',
  'useIsFetching',
  'useIsMutating',
  // React Navigation / Expo Router
  'useNavigation',
  'useRoute',
  'useRouter',
  'usePathname',
  'useSegments',
  'useSearchParams',
  'useLocalSearchParams',
  'useGlobalSearchParams',
  'useFocusEffect',
  'useNavigationState',
  // i18next
  'useTranslation',
  // Zustand - selector runs on every render
  'useStoreWithEqualityFn',
  // React Spring / Animated
  'useSpring',
  'useSprings',
  'useTrail',
  'useChain',
  // Syncfusion
  'useDynamicFormStyles',
  // React Hook Form - options object is safely handled
  'useForm',
  'useFormContext',
  'useController',
  'useWatch',
  'useFieldArray',
]);

/**
 * Check if a node is an unstable initializer (function, object, or array literal
 * NOT wrapped in useCallback/useMemo/other stable call).
 */
function isUnstableInit(initNode) {
  if (!initNode) return null;

  // Arrow functions and function expressions are unstable
  if (
    initNode.type === 'ArrowFunctionExpression' ||
    initNode.type === 'FunctionExpression'
  )
    return 'function';

  // Object literals are unstable
  if (initNode.type === 'ObjectExpression') return 'object';

  // Array literals are unstable
  if (initNode.type === 'ArrayExpression') return 'array';

  return null;
}

/**
 * Check if a call expression is a stable initializer (useCallback, useMemo, etc.)
 */
function isStableCall(initNode) {
  if (initNode.type !== 'CallExpression') return false;

  const callee = initNode.callee;

  // Direct call: useCallback(...), useMemo(...)
  if (callee.type === 'Identifier')
    return STABLE_INIT_CALLS.has(callee.name);

  // Member expression: StyleSheet.create(...), Object.freeze(...)
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.property.type === 'Identifier'
  )
    return STABLE_INIT_CALLS.has(`${callee.object.name}.${callee.property.name}`);

  return false;
}

/**
 * Get the callee name from a CallExpression node.
 */
function getCalleeName(callNode) {
  const callee = callNode.callee;
  if (callee.type === 'Identifier') return callee.name;
  if (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.property.type === 'Identifier'
  )
    return `${callee.object.name}.${callee.property.name}`;

  return null;
}

/**
 * Check if a function name looks like a custom hook (starts with "use" + uppercase).
 */
function isCustomHookName(name, extraIgnored, patterns) {
  if (!name || name.length <= 3 || !name.startsWith('use')) return false;
  const charAfterUse = name[3];
  const isUpperCase = charAfterUse === charAfterUse.toUpperCase() && charAfterUse !== charAfterUse.toLowerCase();
  if (!isUpperCase) return false;
  if (IGNORED_HOOKS.has(name)) return false;
  if (extraIgnored && extraIgnored.has(name)) return false;
  if (patterns && patterns.some((re) => re.test(name))) return false;
  return true;
}

/**
 * Check if a node is inside a React component or custom hook (function scope
 * where this rule applies).
 */
function isInsideComponentOrHook(node) {
  let current = node.parent;
  while (current) {
    const isFunction =
      current.type === 'FunctionDeclaration' ||
      current.type === 'FunctionExpression' ||
      current.type === 'ArrowFunctionExpression';

    if (isFunction) {
      // Check if it's a component (PascalCase) or hook (use* prefix)
      const name = getFunctionName(current);
      if (!name) return false;
      const isPascalCase = name[0] === name[0].toUpperCase() && name[0] !== name[0].toLowerCase();
      const isHook = name.length > 3 && name.startsWith('use');
      return isPascalCase || isHook;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Get the name of a function node.
 */
function getFunctionName(funcNode) {
  // function Foo() {}
  if (funcNode.id) return funcNode.id.name;

  // const Foo = () => {} or const Foo = function() {}
  if (
    funcNode.parent &&
    funcNode.parent.type === 'VariableDeclarator' &&
    funcNode.parent.id &&
    funcNode.parent.id.type === 'Identifier'
  )
    return funcNode.parent.id.name;

  return null;
}

const requireStableHookArgsRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow passing unstable functions/objects/arrays to custom hooks. Wrap in useCallback/useMemo to prevent infinite re-renders.',
      category: 'Possible Errors',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignoreHooks: {
            type: 'array',
            items: { type: 'string' },
            description: 'Additional hook names to ignore (e.g., ["useMyLibraryHook"])',
          },
          ignoreHookPatterns: {
            type: 'array',
            items: { type: 'string' },
            description: 'Regex patterns for hook names to ignore (e.g., ["^useIdentityService", "^useQuestionerWeb"])',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      unstableFunction:
        'Unstable function "{{name}}" passed to hook "{{hook}}". Wrap in useCallback() to prevent infinite re-renders.',
      unstableObject:
        'Unstable object "{{name}}" passed to hook "{{hook}}". Wrap in useMemo() to prevent infinite re-renders.',
      unstableArray:
        'Unstable array "{{name}}" passed to hook "{{hook}}". Wrap in useMemo() to prevent infinite re-renders.',
      unstableInlineFunction:
        'Inline function passed to hook "{{hook}}". Extract to a useCallback() variable to prevent infinite re-renders.',
      unstableInlineObject:
        'Inline object passed to hook "{{hook}}". Extract to a useMemo() variable to prevent infinite re-renders.',
      unstableInlineArray:
        'Inline array passed to hook "{{hook}}". Extract to a useMemo() variable to prevent infinite re-renders.',
    },
  },

  create(context) {
    const options = context.options[0] || {};
    const extraIgnored = options.ignoreHooks ? new Set(options.ignoreHooks) : null;
    const ignorePatterns = (options.ignoreHookPatterns || []).map((p) => new RegExp(p));
    // Track unstable variable declarations: name -> { type, node }
    const unstableVars = new Map();

    return {
      /**
       * Track variable declarations with unstable initializers.
       * e.g., const t = (key) => i18nT(key);
       */
      VariableDeclarator(node) {
        if (
          !node.id ||
          node.id.type !== 'Identifier' ||
          !node.init
        )
          return;

        // Skip if the init is a stable call (useCallback, useMemo, etc.)
        if (isStableCall(node.init)) return;

        const unstableType = isUnstableInit(node.init);
        if (!unstableType) return;

        // Only track if inside a component or hook
        if (!isInsideComponentOrHook(node)) return;

        unstableVars.set(node.id.name, {
          type: unstableType,
          node: node,
        });
      },

      /**
       * Check call expressions that look like custom hooks.
       * Flag any arguments that reference unstable variables or are inline literals.
       */
      CallExpression(node) {
        const hookName = getCalleeName(node);
        if (!isCustomHookName(hookName, extraIgnored, ignorePatterns)) return;
        if (!isInsideComponentOrHook(node)) return;

        for (const arg of node.arguments) {
          // Check identifier arguments against tracked unstable vars
          if (arg.type === 'Identifier') {
            const tracked = unstableVars.get(arg.name);
            if (!tracked) continue;

            const messageMap = {
              function: 'unstableFunction',
              object: 'unstableObject',
              array: 'unstableArray',
            };

            context.report({
              node: arg,
              messageId: messageMap[tracked.type],
              data: {
                name: arg.name,
                hook: hookName,
              },
            });
            continue;
          }

          // Check inline unstable arguments (arrow functions, objects, arrays)
          const inlineType = isUnstableInit(arg);
          if (inlineType) {
            const inlineMessageMap = {
              function: 'unstableInlineFunction',
              object: 'unstableInlineObject',
              array: 'unstableInlineArray',
            };

            context.report({
              node: arg,
              messageId: inlineMessageMap[inlineType],
              data: { hook: hookName },
            });
          }
        }
      },
    };
  },
};

export default {
  rules: {
    'require-stable-hook-args': requireStableHookArgsRule,
  },
};
