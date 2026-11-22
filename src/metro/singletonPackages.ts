/** Packages that hold React context or a module singleton, mapped to the host file every import and require resolves to. */
export const SINGLETON_PACKAGES: ReadonlyMap<string, string> = new Map([
  ['@tanstack/react-query', '@tanstack/react-query'],
  ['react-i18next', 'react-i18next'],
  ['i18next', 'i18next'],
  ['axios', 'axios/dist/browser/axios.cjs'],
  ['react-redux', 'react-redux'],
  ['react-hook-form', 'react-hook-form'],
]);
