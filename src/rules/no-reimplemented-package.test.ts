import { RuleTester } from 'eslint';

import plugin from './no-reimplemented-package.js';

const rule = plugin.rules['no-reimplemented-package'] as unknown as Parameters<RuleTester['run']>[1];

const ruleTester = new RuleTester({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
});

const PLAIN = 'export const value = 1;';
const CSRF_HEADER = "export const headers = { 'X-BFF-Csrf': '1' };";
const ANALYTICS_FILE = '/repo/kefi-web/src/lib/analytics/track.ts';

ruleTester.run('no-reimplemented-package', rule, {
  valid: [
    { code: PLAIN, filename: '/repo/kefi-web/src/features/events/EventList.tsx' },
    { code: "import { track } from '@dloizides/analytics-web';", filename: '/repo/kefi-web/src/features/events/useTrack.ts' },
    { code: PLAIN, filename: '/repo/NpmPackages/packages/analytics-web/src/lib/analytics/track.ts' },
    { code: CSRF_HEADER, filename: '/repo/NpmPackages/packages/bff-web-client/src/interceptors/defaultCsrfInterceptor.ts' },
    { code: CSRF_HEADER, filename: '/repo/kefi-web/src/api/kefiHttp.test.ts' },
    { code: PLAIN, filename: '/repo/kefi-web/e2e/helpers/logger.ts' },
    { code: PLAIN, filename: '/repo/kefi-web/node_modules/x/src/utils/logger.ts' },
    { code: PLAIN, filename: ANALYTICS_FILE, options: [{ allow: ['/src/lib/analytics/'] }] },
    { code: "export const name = 'X-BFF-Csrf-Extra';", filename: '/repo/kefi-web/src/api/kefiHttp.ts' },
  ],

  invalid: [
    { code: PLAIN, filename: ANALYTICS_FILE, errors: [{ messageId: 'reimplemented', data: { id: 'analytics', package: '@dloizides/analytics-web', use: 'createAnalytics, track, createWebVitals' } }] },
    { code: PLAIN, filename: '/repo/katalogos-web/src/services/UmamiClient.ts', errors: [{ messageId: 'reimplemented' }] },
    { code: PLAIN, filename: 'C:\\repo\\agora-web\\src\\hooks\\useWebVitalsTracking.ts', errors: [{ messageId: 'reimplemented' }] },
    { code: CSRF_HEADER, filename: '/repo/kefi-web/src/api/kefiHttp.ts', errors: [{ messageId: 'reimplemented' }] },
    { code: "const a = 'x-bff-csrf'; const b = `X-BFF-Csrf`;", filename: '/repo/ichnos-web/src/http/bffJsonPost.ts', errors: [{ messageId: 'reimplemented' }] },
    { code: PLAIN, filename: '/repo/apps/aml-v2/src/auth/bffCsrf.ts', errors: [{ messageId: 'reimplemented' }] },
    { code: PLAIN, filename: '/repo/erevna-web/src/auth/forgotPasswordRequest.ts', errors: [{ messageId: 'reimplemented' }] },
    { code: PLAIN, filename: '/repo/selida-web/src/utils/logger.ts', errors: [{ messageId: 'reimplemented' }] },
    { code: CSRF_HEADER, filename: '/repo/kefi-web/src/lib/analytics/send.ts', errors: [{ messageId: 'reimplemented' }, { messageId: 'reimplemented' }] },
  ],
});
