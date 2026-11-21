import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { createResolveRequest, type MetroResolveContext } from './index';

const QUERY_PACKAGE = '@tanstack/react-query';
const QUERY_MAIN = 'index.cjs';

function makeProjectWithQueryPackage(): string {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'metro-singleton-'));
  const packageDir = path.join(projectRoot, 'node_modules', '@tanstack', 'react-query');
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({ name: QUERY_PACKAGE, main: QUERY_MAIN }));
  fs.writeFileSync(path.join(packageDir, QUERY_MAIN), '');
  return projectRoot;
}

function contextResolvingTo(filePath: string): MetroResolveContext {
  const context: MetroResolveContext = { resolveRequest: () => ({ filePath, type: 'sourceFile' }) };
  return context;
}

describe('createResolveRequest', () => {
  it('with react-query required from a CommonJS package and imported from ESM app code, resolves both to one file', () => {
    const projectRoot = makeProjectWithQueryPackage();
    const resolve = createResolveRequest(projectRoot);
    const fromCjsPackage = contextResolvingTo('/node_modules/@tanstack/react-query/build/modern/index.cjs');
    const fromEsmApp = contextResolvingTo('/node_modules/@tanstack/react-query/build/modern/index.js');

    const resolved = [resolve(fromCjsPackage, QUERY_PACKAGE, 'web'), resolve(fromEsmApp, QUERY_PACKAGE, 'web')];

    const expected = fs.realpathSync(path.join(projectRoot, 'node_modules', '@tanstack', 'react-query', QUERY_MAIN));
    expect(resolved.map((r) => fs.realpathSync(String(r.filePath)))).toEqual([expected, expected]);
  });

  it('with a module that is not a pinned singleton, delegates to the Metro resolver', () => {
    const projectRoot = makeProjectWithQueryPackage();
    const resolve = createResolveRequest(projectRoot);
    const delegated = '/node_modules/other/index.js';

    const resolved = resolve(contextResolvingTo(delegated), 'other', 'web');

    expect(resolved.filePath).toBe(delegated);
  });
});
