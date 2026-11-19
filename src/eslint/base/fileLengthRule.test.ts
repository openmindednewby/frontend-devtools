import { Linter } from 'eslint';

import { HOUSE_RULES } from './importRules';

const FILE_LIMIT = 300;

function lintMaxLines(code: string): Linter.LintMessage[] {
  const linter = new Linter({ configType: 'flat' });
  const config = [{ files: ['**/*.js'], rules: { 'max-lines': HOUSE_RULES['max-lines'] } }];
  return linter.verify(code, config as unknown as Linter.FlatConfig[], { filename: 'sample.js' });
}

function codeLines(count: number): string[] {
  return Array.from({ length: count }, (_value, index) => `const v${String(index)} = ${String(index)};`);
}

describe('HOUSE_RULES max-lines', () => {
  it('with 301 raw lines of which 150 are blank, reports the file', () => {
    const code = [...Array.from({ length: 150 }, () => ''), ...codeLines(151)].join('\n');

    const messages = lintMaxLines(code);

    expect(messages.map((m) => m.ruleId)).toEqual(['max-lines']);
  });

  it('with 301 raw lines of which 150 are comments, reports the file', () => {
    const code = [...codeLines(151), ...Array.from({ length: 150 }, () => '// note')].join('\n');

    const messages = lintMaxLines(code);

    expect(messages.map((m) => m.ruleId)).toEqual(['max-lines']);
  });

  it('with exactly 300 lines of code, reports nothing', () => {
    const code = codeLines(FILE_LIMIT).join('\n');

    const messages = lintMaxLines(code);

    expect(messages).toEqual([]);
  });
});
