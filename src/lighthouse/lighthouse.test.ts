import { budgetAssertions, mobileSettings, withBudgets } from './index';

describe('lighthouse budgets', () => {
  it('holds the D-OBS-15 numbers as warn-only assertions', () => {
    expect(budgetAssertions).toEqual({
      'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
      'total-blocking-time': ['warn', { maxNumericValue: 200 }],
      'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
      'resource-summary:script:size': ['warn', { maxNumericValue: 307200 }],
    });
  });

  it('emulates a mobile phone', () => {
    expect(mobileSettings.formFactor).toBe('mobile');
    expect(mobileSettings.screenEmulation.mobile).toBe(true);
  });

  it('merges into an app config and keeps the app keys', () => {
    const app = {
      ci: {
        collect: { url: ['http://localhost:8099/'], settings: { skipAudits: ['splash-screen'] } },
        assert: { assertions: { 'categories:accessibility': ['error', { minScore: 0.9 }] } },
        upload: { target: 'filesystem' },
      },
    };
    const merged = withBudgets(app);
    expect(merged.ci.collect.url).toEqual(['http://localhost:8099/']);
    expect(merged.ci.collect.settings).toMatchObject({ skipAudits: ['splash-screen'], formFactor: 'mobile' });
    expect(merged.ci.assert.assertions).toMatchObject({
      'categories:accessibility': ['error', { minScore: 0.9 }],
      'total-blocking-time': ['warn', { maxNumericValue: 200 }],
    });
    expect(merged.ci.upload).toEqual({ target: 'filesystem' });
  });

  it('lets an app override one budget', () => {
    const merged = withBudgets({ ci: { assert: { assertions: { 'total-blocking-time': ['warn', { maxNumericValue: 400 }] } } } });
    expect(merged.ci.assert.assertions['total-blocking-time']).toEqual(['warn', { maxNumericValue: 400 }]);
  });

  it('works with an empty ci block', () => {
    const merged = withBudgets({ ci: {} });
    expect(merged.ci.assert.assertions['largest-contentful-paint']).toEqual(['warn', { maxNumericValue: 2500 }]);
  });
});
