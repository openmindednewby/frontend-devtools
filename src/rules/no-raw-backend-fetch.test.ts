import { RuleTester } from 'eslint';

import plugin from './no-raw-backend-fetch.js';

const rule = plugin.rules['no-raw-backend-fetch'] as unknown as Parameters<RuleTester['run']>[1];

const ruleTester = new RuleTester({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
});

const APP_FILE = '/repo/kefi-web/src/api/registrationApi.ts';
const COMPONENT_FILE = '/repo/apps/aml-v2/src/screens/jobs/RunImport.tsx';
const RAW_FETCH = "export const load = () => fetch('/bff/api/events');";
const AXIOS_IMPORT = "import axios from 'axios';";

ruleTester.run('no-raw-backend-fetch', rule, {
  valid: [
    { code: 'export const load = () => kefiHttp.get(url);', filename: APP_FILE },
    { code: "export const load = () => api.fetch('/bff/x');", filename: APP_FILE },
    { code: "export const load = () => queryClient.fetchQuery({ queryKey: ['x'] });", filename: APP_FILE },
    { code: RAW_FETCH, filename: '/repo/erevna-web/src/server/customHooks/usePublicFileUpload.ts' },
    { code: RAW_FETCH, filename: '/repo/erevna-web/src/http/client.ts' },
    { code: AXIOS_IMPORT, filename: '/repo/erevna-web/src/lib/http/utils/methods.ts' },
    { code: AXIOS_IMPORT, filename: '/repo/NpmPackages/packages/bff-web-client/src/createClient.ts' },
    { code: RAW_FETCH, filename: '/repo/apps/aml-v2/src/api/generated/jobs/amlJobs.ts' },
    { code: RAW_FETCH, filename: '/repo/kefi-web/src/service-worker.ts' },
    { code: RAW_FETCH, filename: '/repo/kefi-web/src/sw.ts' },
    { code: RAW_FETCH, filename: '/repo/kefi-web/src/app/+html.tsx' },
    { code: RAW_FETCH, filename: '/repo/kefi-web/src/api/registrationApi.test.ts' },
    { code: RAW_FETCH, filename: '/repo/kefi-web/src/api/__tests__/registration.ts' },
    { code: RAW_FETCH, filename: '/repo/kefi-web/e2e/helpers/seed.ts' },
    { code: "const blob = await fetch('data:image/png;base64,AAAA').then((r) => r.blob());", filename: COMPONENT_FILE },
    { code: 'const blob = await fetch(`blob:${origin}/abc`);', filename: COMPONENT_FILE },
    { code: "import type { AxiosInstance } from 'axios';", filename: APP_FILE },
    { code: "import { type AxiosError, type AxiosInstance } from 'axios';", filename: APP_FILE },
    { code: RAW_FETCH, filename: '/repo/erevna-web/src/lib/api/apiClient.ts', options: [{ allow: ['/src/lib/api/'] }] },
  ],

  invalid: [
    { code: RAW_FETCH, filename: APP_FILE, errors: [{ messageId: 'rawFetch' }] },
    { code: 'export const load = (url: string) => fetch(url, { credentials: "include" });', filename: COMPONENT_FILE, errors: [{ messageId: 'rawFetch' }] },
    { code: "export const load = () => window.fetch('/bff/me');", filename: APP_FILE, errors: [{ messageId: 'rawFetch' }] },
    { code: "export const load = () => globalThis.fetch('/bff/me');", filename: APP_FILE, errors: [{ messageId: 'rawFetch' }] },
    { code: 'export const load = () => fetch(`${base}/api/users`);', filename: APP_FILE, errors: [{ messageId: 'rawFetch' }] },
    { code: AXIOS_IMPORT, filename: APP_FILE, errors: [{ messageId: 'rawAxios' }] },
    { code: "import axios, { type AxiosError } from 'axios';", filename: APP_FILE, errors: [{ messageId: 'rawAxios' }] },
    { code: "const axios = require('axios');", filename: APP_FILE, errors: [{ messageId: 'rawAxios' }] },
    { code: "const mod = await import('axios');", filename: APP_FILE, errors: [{ messageId: 'rawAxios' }] },
    { code: RAW_FETCH, filename: 'C:\\repo\\kefi-web\\src\\auth\\verifyEmailApi.ts', errors: [{ messageId: 'rawFetch' }] },
    { code: RAW_FETCH, filename: '/repo/erevna-web/src/lib/api/apiClient.ts', options: [{ allow: ['/src/other/'] }], errors: [{ messageId: 'rawFetch' }] },
  ],
});
