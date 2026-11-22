import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { createResolveRequest, type MetroResolveContext } from './index';
import { SINGLETON_PACKAGES } from './singletonPackages';

const PACKAGE_MAIN = 'index.cjs';
const NODE_BUILD = 'dist/node/axios.cjs';

function makeProjectWithPackage(packageName: string, hostSpecifier: string): { projectRoot: string; hostFile: string } {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'metro-singleton-'));
  const packageDir = path.join(projectRoot, 'node_modules', packageName);
  fs.mkdirSync(packageDir, { recursive: true });
  fs.writeFileSync(path.join(packageDir, 'package.json'), JSON.stringify({ name: packageName, main: PACKAGE_MAIN }));
  fs.writeFileSync(path.join(packageDir, PACKAGE_MAIN), '');
  const hostFile = hostSpecifier === packageName
    ? path.join(packageDir, PACKAGE_MAIN)
    : path.join(projectRoot, 'node_modules', hostSpecifier);
  fs.mkdirSync(path.dirname(hostFile), { recursive: true });
  fs.writeFileSync(hostFile, '');
  return { projectRoot, hostFile: fs.realpathSync(hostFile) };
}

function contextResolvingTo(filePath: string): MetroResolveContext {
  const context: MetroResolveContext = { resolveRequest: () => ({ filePath, type: 'sourceFile' }) };
  return context;
}

describe('createResolveRequest', () => {
  it.each([...SINGLETON_PACKAGES.entries()])(
    'with %s required from a CommonJS package and imported from ESM app code, resolves both to the host file %s',
    (packageName, hostSpecifier) => {
      const { projectRoot, hostFile } = makeProjectWithPackage(packageName, hostSpecifier);
      const resolve = createResolveRequest(projectRoot);
      const fromCjsPackage = contextResolvingTo(`/node_modules/${packageName}/dist/index.cjs`);
      const fromEsmApp = contextResolvingTo(`/node_modules/${packageName}/dist/index.mjs`);

      const resolved = [resolve(fromCjsPackage, packageName, 'web'), resolve(fromEsmApp, packageName, 'web')];

      expect(resolved.map((r) => fs.realpathSync(String(r.filePath)))).toEqual([hostFile, hostFile]);
    },
  );

  it('with axios, resolves to the browser build, never the node build that needs http', () => {
    const { projectRoot } = makeProjectWithPackage('axios', String(SINGLETON_PACKAGES.get('axios')));
    fs.mkdirSync(path.join(projectRoot, 'node_modules', 'axios', 'dist', 'node'), { recursive: true });
    fs.writeFileSync(path.join(projectRoot, 'node_modules', 'axios', NODE_BUILD), '');
    const resolve = createResolveRequest(projectRoot);

    const resolved = resolve(contextResolvingTo('/unused.js'), 'axios', 'web');

    expect(path.relative(projectRoot, String(resolved.filePath)).split(path.sep).join('/')).toBe('node_modules/axios/dist/browser/axios.cjs');
  });

  it('with a pinned singleton the host app does not install, delegates to the Metro resolver', () => {
    const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'metro-singleton-'));
    const resolve = createResolveRequest(projectRoot);
    const delegated = '/node_modules/react-redux/dist/cjs/index.js';

    const resolved = resolve(contextResolvingTo(delegated), 'react-redux', 'web');

    expect(resolved.filePath).toBe(delegated);
  });

  it('with a module that is not a pinned singleton, delegates to the Metro resolver', () => {
    const { projectRoot } = makeProjectWithPackage('@tanstack/react-query', '@tanstack/react-query');
    const resolve = createResolveRequest(projectRoot);
    const delegated = '/node_modules/other/index.js';

    const resolved = resolve(contextResolvingTo(delegated), 'other', 'web');

    expect(resolved.filePath).toBe(delegated);
  });
});
