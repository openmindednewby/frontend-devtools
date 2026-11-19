import { compareBaseline, countViolations, gatePasses, totalsPerRule } from './countGate';
import { parseGateArgs } from './gateArgs';
import { GateMode } from './GateMode';

const ROOT = '/src/app';
const MEMBER = '@typescript-eslint/member-ordering';
const FIELDS = 'member-order-fields/member-ordering';

function result(file: string, ruleIds: Array<string | null>): { filePath: string; messages: Array<{ ruleId: string | null }> } {
  return { filePath: `${ROOT}/${file}`, messages: ruleIds.map((ruleId) => ({ ruleId })) };
}

describe('countViolations', () => {
  it('with two member-ordering messages in one file, counts 2 under the relative path', () => {
    const results = [result('src/a.ts', [MEMBER, MEMBER])];

    const baseline = countViolations(results, ROOT);

    expect(baseline).toEqual({ 'src/a.ts': { [MEMBER]: 2 } });
  });

  it('with a rule outside the gate and a null rule id, ignores both', () => {
    const results = [result('src/a.ts', ['no-console', null, 'max-lines'])];

    const baseline = countViolations(results, ROOT);

    expect(baseline).toEqual({ 'src/a.ts': { 'max-lines': 1 } });
  });

  it('with a file that has no gated message, leaves it out', () => {
    const results = [result('src/clean.ts', ['no-console'])];

    const baseline = countViolations(results, ROOT);

    expect(baseline).toEqual({});
  });

  it('with Windows separators in path and root, writes a forward-slash relative path', () => {
    const results = [{ filePath: 'C:\\app\\src\\b.ts', messages: [{ ruleId: FIELDS }] }];

    const baseline = countViolations(results, 'C:\\app\\');

    expect(Object.keys(baseline)).toEqual(['src/b.ts']);
  });

  it('with files given out of order, returns the paths sorted', () => {
    const results = [result('z.ts', ['max-lines']), result('a.ts', ['max-lines'])];

    const baseline = countViolations(results, ROOT);

    expect(Object.keys(baseline)).toEqual(['a.ts', 'z.ts']);
  });
});

describe('compareBaseline', () => {
  it('with counts equal to the baseline, passes with nothing reported', () => {
    const baseline = { 'a.ts': { [MEMBER]: 2 } };

    const report = compareBaseline(baseline, { 'a.ts': { [MEMBER]: 2 } });

    expect(report).toEqual({ rises: [], newFiles: [], stale: [] });
  });

  it('with a count above the baseline, reports a rise and fails', () => {
    const baseline = { 'a.ts': { [MEMBER]: 2 } };

    const report = compareBaseline(baseline, { 'a.ts': { [MEMBER]: 3 } });

    expect({ rises: report.rises, passes: gatePasses(report) }).toEqual({
      rises: [{ file: 'a.ts', ruleId: MEMBER, baseline: 2, actual: 3 }],
      passes: false,
    });
  });

  it('with a new rule in a baselined file, reports a rise from 0', () => {
    const baseline = { 'a.ts': { [MEMBER]: 1 } };

    const report = compareBaseline(baseline, { 'a.ts': { [MEMBER]: 1, 'max-lines': 1 } });

    expect(report.rises).toEqual([{ file: 'a.ts', ruleId: 'max-lines', baseline: 0, actual: 1 }]);
  });

  it('with a file missing from the baseline, reports a new file and fails', () => {
    const report = compareBaseline({}, { 'b.ts': { 'max-lines': 1 } });

    expect({ newFiles: report.newFiles, passes: gatePasses(report) }).toEqual({
      newFiles: [{ file: 'b.ts', ruleId: 'max-lines', baseline: 0, actual: 1 }],
      passes: false,
    });
  });

  it('with a count below the baseline, reports stale and still passes', () => {
    const baseline = { 'a.ts': { [MEMBER]: 3 }, 'gone.ts': { 'max-lines': 1 } };

    const report = compareBaseline(baseline, { 'a.ts': { [MEMBER]: 1 } });

    expect({ stale: report.stale, passes: gatePasses(report) }).toEqual({
      stale: [
        { file: 'a.ts', ruleId: MEMBER, baseline: 3, actual: 1 },
        { file: 'gone.ts', ruleId: 'max-lines', baseline: 1, actual: 0 },
      ],
      passes: true,
    });
  });
});

describe('totalsPerRule', () => {
  it('with two files, sums each rule across files', () => {
    const baseline = { 'a.ts': { [MEMBER]: 2, 'max-lines': 1 }, 'b.ts': { [MEMBER]: 1 } };

    const totals = totalsPerRule(baseline);

    expect(totals).toEqual({ [MEMBER]: 3, 'max-lines': 1 });
  });
});

describe('parseGateArgs', () => {
  it('with check and an input path, defaults the baseline file and root', () => {
    const argv = ['check', '--input', 'out.json'];

    const args = parseGateArgs(argv, '/repo');

    expect(args).toEqual({ mode: GateMode.Check, input: 'out.json', baseline: 'eslint-baseline.json', root: '/repo', passthrough: [] });
  });

  it('with write and every option, returns them', () => {
    const argv = ['write', '--input', 'o.json', '--baseline', 'b.json', '--root', '/box/app'];

    const args = parseGateArgs(argv, '/repo');

    expect(args).toEqual({ mode: GateMode.Write, input: 'o.json', baseline: 'b.json', root: '/box/app', passthrough: [] });
  });

  it('with an unknown mode, throws a usage error', () => {
    const argv = ['fix', '--input', 'o.json'];

    const parse = (): unknown => parseGateArgs(argv, '/repo');

    expect(parse).toThrow(/usage/);
  });

  it('without an input path, throws a usage error', () => {
    const argv = ['check'];

    const parse = (): unknown => parseGateArgs(argv, '/repo');

    expect(parse).toThrow(/usage/);
  });
});
