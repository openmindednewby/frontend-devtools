import { Linter } from 'eslint';
import * as tsParser from '@typescript-eslint/parser';

import { HOUSE_PATTERN_RULE_NAMES, patternPacksConfig } from './patternPacks';
import { ruleNames } from './plugin';

const FILE = 'src/features/clients/useClients.tsx';
const PACK_PREFIXES = ['@tanstack/query/', 'react-you-might-not-need-an-effect/', 'boundaries/', 'sonarjs/', '@dloizides/'];

function lint(code: string): Linter.LintMessage[] {
  const linter = new Linter({ configType: 'flat' });
  const config = [
    {
      ...patternPacksConfig,
      files: ['**/*.tsx'],
      languageOptions: {
        parser: tsParser,
        parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
      },
    },
  ] as unknown as Linter.FlatConfig[];
  return linter.verify(code, config, FILE);
}

function ruleIdsOf(code: string): string[] {
  return lint(code).map((message) => String(message.ruleId));
}

function levelOf(entry: unknown): unknown {
  return Array.isArray(entry) ? entry[0] : entry;
}

describe('patternPacksConfig', () => {
  it('with every rule it enables, sets warn or off and never error', () => {
    const levels = Object.values(patternPacksConfig.rules ?? {}).map(levelOf);

    const nonWarn = levels.filter((level) => level !== 'warn' && level !== 'off' && level !== 0);

    expect(nonWarn).toEqual([]);
  });

  it('with the four packs and the house rules, enables rules from every namespace', () => {
    const names = Object.keys(patternPacksConfig.rules ?? {});

    const missing = PACK_PREFIXES.filter((prefix) => !names.some((name) => name.startsWith(prefix)));

    expect(missing).toEqual([]);
  });

  it('with the house rule names, registers each one in the shared plugin', () => {
    const unregistered = HOUSE_PATTERN_RULE_NAMES.filter((name) => !ruleNames.includes(name));

    expect(unregistered).toEqual([]);
  });

  it('with an inline queryKey missing a queryFn dependency, warns from the TanStack pack and the house rule', () => {
    const code = "import { useQuery } from '@tanstack/react-query'; export const useClient = (id: string) => useQuery({ queryKey: ['clients'], queryFn: () => load(id) });";

    const ids = ruleIdsOf(code);

    expect(ids).toEqual(expect.arrayContaining(['@tanstack/query/exhaustive-deps', '@dloizides/query-key-factory']));
  });

  it('with state derived from a prop inside an effect, warns from the effect pack', () => {
    const code = [
      "import { useEffect, useState } from 'react';",
      'export function Total({ price }: { price: number }) {',
      '  const [total, setTotal] = useState(0);',
      '  useEffect(() => { setTotal(price * 2); }, [price]);',
      '  return total;',
      '}',
    ].join('\n');

    const ids = ruleIdsOf(code);

    expect(ids).toContain('react-you-might-not-need-an-effect/no-derived-state');
  });

  it('with two identical branches, warns from the SonarJS pack at warn severity', () => {
    const code = 'export const pick = (a: boolean) => (a ? 1 : 1);';

    const severities = lint(code).filter((message) => String(message.ruleId).startsWith('sonarjs/')).map((message) => message.severity);

    expect(severities).toEqual([1]);
  });
});
