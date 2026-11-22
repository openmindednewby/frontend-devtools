import * as fs from 'fs';
import { createRequire } from 'module';
import * as path from 'path';

import { SINGLETON_PACKAGES } from './singletonPackages';

export interface MetroResolution {
  filePath?: string;
  type: string;
}

export interface MetroResolveContext {
  resolveRequest: (context: MetroResolveContext, moduleName: string, platform: string | null) => MetroResolution;
}

export type MetroResolveRequest = (context: MetroResolveContext, moduleName: string, platform: string | null) => MetroResolution;

export interface MetroConfigLike {
  resolver?: Record<string, unknown>;
}

export interface SharedMetroOptions {
  projectRoot: string;
  blockedDirs?: string[];
  srcDir?: string;
}

const DEFAULT_BLOCKED_DIRS = ['dist', 'coverage', 'lighthouse-reports'];
const ALIAS_PREFIX = '@/';
const ALIAS_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx', '/index.js'];

/** Regexes that keep Metro's watcher out of build-output dirs (Windows symlink lstat errors). */
export function buildBlockList(projectRoot: string, dirs: readonly string[] = DEFAULT_BLOCKED_DIRS): RegExp[] {
  return dirs
    .map((dir) => path.join(projectRoot, dir))
    .map((p) => new RegExp(`^${p.replace(/\\/g, '\\\\').replace(/\//g, '[\\\\/]')}.*`));
}

function resolveAlias(projectRoot: string, srcDir: string, moduleName: string): MetroResolution | undefined {
  const basePath = path.join(projectRoot, srcDir, moduleName.slice(ALIAS_PREFIX.length));
  const filePath = ALIAS_EXTENSIONS.map((ext) => basePath + ext).find((candidate) => fs.existsSync(candidate));
  return filePath === undefined ? undefined : { filePath, type: 'sourceFile' };
}

function resolveHostCopy(projectRoot: string, packageName: string, moduleName: string): MetroResolution | undefined {
  if (moduleName !== packageName && !moduleName.startsWith(`${packageName}/`)) {
    return undefined;
  }
  const hostPath = path.join(projectRoot, 'node_modules', packageName);
  const file = moduleName === packageName ? 'index.js' : `${moduleName.replace(`${packageName}/`, '')}.js`;
  return { filePath: path.join(hostPath, file), type: 'sourceFile' };
}

function resolveSingleton(projectRoot: string, moduleName: string): MetroResolution | undefined {
  const hostSpecifier = SINGLETON_PACKAGES.get(moduleName);
  if (hostSpecifier === undefined) {
    return undefined;
  }
  try {
    return { filePath: createRequire(path.join(projectRoot, 'package.json')).resolve(hostSpecifier), type: 'sourceFile' };
  } catch {
    return undefined;
  }
}

/** Resolver that maps `@/` to src and forces react, react-dom and every SINGLETON_PACKAGES entry to the host app's single copy. */
export function createResolveRequest(projectRoot: string, srcDir = 'src'): MetroResolveRequest {
  return (context: MetroResolveContext, moduleName: string, platform: string | null): MetroResolution => {
    const aliased = moduleName.startsWith(ALIAS_PREFIX) ? resolveAlias(projectRoot, srcDir, moduleName) : undefined;
    return aliased
      ?? resolveHostCopy(projectRoot, 'react', moduleName)
      ?? resolveHostCopy(projectRoot, 'react-dom', moduleName)
      ?? resolveSingleton(projectRoot, moduleName)
      ?? context.resolveRequest(context, moduleName, platform);
  };
}

/** Applies the house resolver settings to the config from expo's `getDefaultConfig(projectRoot)`. */
export function withSharedMetroConfig<T extends MetroConfigLike>(config: T, options: SharedMetroOptions): T {
  const { projectRoot } = options;
  return {
    ...config,
    resolver: {
      ...config.resolver,
      unstable_enableSymlinks: true,
      unstable_enablePackageExports: true,
      blockList: buildBlockList(projectRoot, options.blockedDirs),
      nodeModulesPaths: [path.join(projectRoot, 'node_modules')],
      resolveRequest: createResolveRequest(projectRoot, options.srcDir),
    },
  };
}
