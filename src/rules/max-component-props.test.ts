import { RuleTester } from 'eslint';

import plugin from './max-component-props.js';

const rule = plugin.rules['max-component-props'] as unknown as Parameters<RuleTester['run']>[1];

const ruleTester = new RuleTester({
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: { ecmaVersion: 2022, sourceType: 'module', ecmaFeatures: { jsx: true } },
});

const CAP = [{ max: 2 }];
const TOO_MANY = [{ messageId: 'tooMany' }];
const FROZEN_GREW = [{ messageId: 'frozenGrew' }];

ruleTester.run('max-component-props', rule, {
  valid: [
    { code: 'interface CardProps { a: string; b: string }', options: CAP },
    { code: 'type CardProps = { a: string; b: string };', options: CAP },
    { code: 'interface Settings { a: string; b: string; c: string }', options: CAP },
    { code: 'interface CardProps extends ViewProps { a: string; b: string }', options: CAP },
    { code: 'interface Base { a: string } interface CardProps extends Base { a: string; b: string }', options: CAP },
    { code: 'type CardProps = { a: string; b: string } | { c: string; d: string };', options: CAP },
    { code: 'function helper(o: { a: string; b: string; c: string }) { return o; }', options: CAP },
    { code: 'interface CardProps { a: string; b: string; c: string }', options: [{ max: 2, frozen: { CardProps: 3 } }] },
    { code: 'interface CardProps { a: string; b: string }', options: [{ max: 1, frozen: { CardProps: 3 } }] },
  ],
  invalid: [
    { code: 'interface CardProps { a: string; b: string; c: string }', options: CAP, errors: TOO_MANY },
    { code: 'export interface CardProps { a: string; b(): void; c: string }', options: CAP, errors: TOO_MANY },
    { code: 'type CardProps = { a: string; b: string; c: string };', options: CAP, errors: TOO_MANY },
    { code: 'type Base = { a: string; b: string }; type CardProps = Base & { c: string };', options: CAP, errors: TOO_MANY },
    { code: 'interface Base { a: string; b: string } interface CardProps extends Base { c: string }', options: CAP, errors: TOO_MANY },
    { code: 'type CardProps = { a: string } | { a: string; b: string; c: string };', options: CAP, errors: TOO_MANY },
    { code: 'function Card(p: { a: string; b: string; c: string }) { return p; }', options: CAP, errors: TOO_MANY },
    { code: 'const Card = ({ a }: { a: string; b: string; c: string }) => a;', options: CAP, errors: TOO_MANY },
    { code: 'const Card = memo(forwardRef((p: { a: string; b: string; c: string }) => p));', options: CAP, errors: TOO_MANY },
    { code: 'interface CardArgs { a: string; b: string; c: string } function Card(p: CardArgs) { return p; }', options: CAP, errors: TOO_MANY },
    { code: 'interface CardProps { a: string; b: string; c: string } const Card = (p: CardProps) => p;', options: CAP, errors: TOO_MANY },
    { code: 'interface CardProps { a: string; b: string; c: string; d: string }', options: [{ max: 2, frozen: { CardProps: 3 } }], errors: FROZEN_GREW },
    { code: 'interface OtherProps { a: string; b: string; c: string }', options: [{ max: 2, frozen: { CardProps: 3 } }], errors: TOO_MANY },
  ],
});
