import { join } from 'path';

import { Linter } from 'eslint';

import { apiConfig } from './configs';

const linter = new Linter({ configType: 'flat' });
const unscoped = [apiConfig] as unknown as Parameters<Linter['verify']>[1];
const inRepo = (relative: string) => join(process.cwd(), relative);
const NESTING_DEPTH = 2000;
const deeplyNested = `${'g('.repeat(NESTING_DEPTH)}0${')'.repeat(NESTING_DEPTH)};`;

describe('apiConfig without a files scope', () => {
  it.each(['src/app.js', 'src/app.mjs', 'src/app.cjs', 'dist/bundle.js', 'coverage/lcov-report/sorter.js'])(
    'on %s, lints without throwing',
    (filename) => {
      const lint = () => linter.verify("fetch('/bff/me'); export const x = 1;", unscoped, inRepo(filename));

      expect(lint).not.toThrow();
    },
  );

  it('on a deeply nested minified-style file under src, lints without throwing', () => {
    const lint = () => linter.verify(`fetch('/bff/me'); ${deeplyNested}`, unscoped, inRepo('src/vendor.min.js'));

    expect(lint).not.toThrow();
  });

  it('on a plain .js file under src, still reports a raw backend fetch', () => {
    const messages = linter.verify("export const load = () => fetch('/bff/me');", unscoped, inRepo('src/app.js'));

    expect(messages.map((message) => message.ruleId)).toEqual(['@dloizides/no-raw-backend-fetch']);
  });
});
