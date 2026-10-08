import { convertPlaywrightReport, type PlaywrightReport } from './playwright';
import { schemaErrors } from './schema/schemaErrors';

const SPEC_FILE = 'checkout/decline.spec.ts';
const SPEC_SOURCE = `requirements({ "AC-07": "An expired card is declined" });`;

function reportWith(expectedStatus: string, actualStatus: string): PlaywrightReport {
  return {
    config: { rootDir: '/repo/e2e' },
    stats: { startTime: '2026-10-08T10:24:00.000Z', duration: 1500 },
    suites: [
      {
        title: SPEC_FILE,
        file: SPEC_FILE,
        suites: [
          {
            title: 'checkout',
            file: SPEC_FILE,
            specs: [
              {
                title: 'with an expired card, shows the decline @AC-07',
                file: SPEC_FILE,
                tags: ['@AC-07'],
                tests: [
                  {
                    expectedStatus,
                    projectName: 'Mobile Chrome',
                    results: [{ status: actualStatus, duration: 412, error: { message: 'declined', stack: 'at pay' } }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('playwright adapter', () => {
  it('AC-14: given a spec calling requirements({"AC-07": "..."}) and a test tagged @AC-07, when the adapter runs, then the JSON has the requirement, covers ["AC-07"], and expectedStatus failed maps to xfail', () => {
    const report = reportWith('failed', 'failed');

    const doc = convertPlaywrightReport(report, { readSource: () => SPEC_SOURCE });

    expect(doc.requirements).toEqual([{ id: 'AC-07', title: 'An expired card is declined', source: SPEC_FILE }]);
    expect(doc.tests.map((test) => [test.covers, test.status, test.expectRed])).toEqual([[['AC-07'], 'xfail', true]]);
    expect(schemaErrors(doc)).toEqual([]);
  });

  it('with expectedStatus failed and a passing result, maps to xpass', () => {
    const report = reportWith('failed', 'passed');

    const doc = convertPlaywrightReport(report, { readSource: () => SPEC_SOURCE });

    expect(doc.tests[0]?.status).toBe('xpass');
  });

  it('with a tagged title, records scenario and expected without the tag', () => {
    const report = reportWith('passed', 'passed');

    const doc = convertPlaywrightReport(report, { readSource: () => undefined });

    expect(doc.tests[0]).toMatchObject({
      status: 'pass',
      class: 'checkout',
      scenario: 'with an expired card',
      expected: 'shows the decline',
      project: 'Mobile Chrome',
    });
  });
});
