function readonlyGlobals(names: readonly string[]): Record<string, 'readonly'> {
  return Object.fromEntries(names.map((name): [string, 'readonly'] => [name, 'readonly']));
}

export const REACT_NATIVE_GLOBALS = readonlyGlobals([
  '__DEV__', 'FormData', 'Headers', 'Request', 'Response', 'AbortController', 'Blob', 'File',
  'FileReader', 'URL', 'URLSearchParams', 'WebSocket', 'console', 'setTimeout', 'setInterval',
  'clearTimeout', 'clearInterval', 'setImmediate', 'clearImmediate', 'requestAnimationFrame',
  'cancelAnimationFrame', 'alert', 'process', 'global', 'window', 'document', 'navigator',
  'localStorage', 'sessionStorage', 'XMLHttpRequest', 'module', 'require', 'exports',
]);

export const TEST_GLOBALS = readonlyGlobals([
  'describe', 'it', 'test', 'expect', 'jest', 'beforeAll', 'beforeEach', 'afterAll', 'afterEach',
]);

export const JEST_SETUP_GLOBALS = readonlyGlobals(['jest', 'global', 'console']);
