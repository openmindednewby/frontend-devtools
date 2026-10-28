/** D-OBS-15 front-end budgets (OBS-1): Core Web Vitals on a mid-range phone, warn only. */
export const LIGHTHOUSE_BUDGETS = {
  lcpMs: 2500,
  tbtMs: 200,
  cls: 0.1,
  scriptBytes: 300 * 1024,
} as const;

type Assertion = ['warn' | 'error', Record<string, number>];

/** Lighthouse CI assertions for the D-OBS-15 budgets; every entry is `warn`, never `error`. */
export const budgetAssertions: Record<string, Assertion> = {
  'largest-contentful-paint': ['warn', { maxNumericValue: LIGHTHOUSE_BUDGETS.lcpMs }],
  'total-blocking-time': ['warn', { maxNumericValue: LIGHTHOUSE_BUDGETS.tbtMs }],
  'cumulative-layout-shift': ['warn', { maxNumericValue: LIGHTHOUSE_BUDGETS.cls }],
  'resource-summary:script:size': ['warn', { maxNumericValue: LIGHTHOUSE_BUDGETS.scriptBytes }],
};

/** Lighthouse's own mid-range phone profile (Moto G Power, simulated slow 4G, 4x CPU slowdown). */
export const mobileSettings = {
  formFactor: 'mobile',
  screenEmulation: { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
  throttlingMethod: 'simulate',
  throttling: { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 },
} as const;

interface LhciConfig {
  ci: {
    collect?: { settings?: Record<string, unknown> } & Record<string, unknown>;
    assert?: { assertions?: Record<string, unknown> } & Record<string, unknown>;
  } & Record<string, unknown>;
}

/** Adds the mobile settings and budget assertions to an app's lighthouserc; app-set keys win. */
export function withBudgets<T extends LhciConfig>(config: T): T {
  const { collect = {}, assert = {} } = config.ci;
  return {
    ...config,
    ci: {
      ...config.ci,
      collect: { ...collect, settings: { ...mobileSettings, ...collect.settings } },
      assert: { ...assert, assertions: { ...budgetAssertions, ...assert.assertions } },
    },
  };
}
