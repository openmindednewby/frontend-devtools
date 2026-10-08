import { parseRequirements } from './sourceRequirements';

describe('parseRequirements', () => {
  it('with braces and a dollar-brace inside titles, keeps every title whole', () => {
    const source = [
      'requirements({',
      "  'AC-01': 'Totals show {currency} codes',",
      '  "REQ.login-2": "Prices render as ${amount}",',
      '});',
    ].join('\n');

    const parsed = parseRequirements(source, 'a.test.ts');

    expect(parsed.requirements.map((r) => [r.id, r.title])).toEqual([
      ['AC-01', 'Totals show {currency} codes'],
      ['REQ.login-2', 'Prices render as ${amount}'],
    ]);
  });

  it('with a non-literal title, reports it with its line instead of dropping it', () => {
    const source = ['const t = "x";', 'requirements({', '  "AC-01": t,', '  "AC-02": `y ${t}`,', '});'].join('\n');

    const parsed = parseRequirements(source, 'b.test.ts');

    expect(parsed.problems.map((p) => [p.file, p.line])).toEqual([
      ['b.test.ts', 3],
      ['b.test.ts', 4],
    ]);
  });
});
