import { basename, isAbsolute, relative, resolve } from 'path';
import { readFileSync } from 'fs';

import type { SourceReader } from '../types';

const BACKSLASH = /\\/g;

export function relativePath(rootDir: string, file: string): string {
  const rel = isAbsolute(file) ? relative(rootDir, file) : file;
  return rel.replace(BACKSLASH, '/');
}

export function fileReader(rootDir: string): SourceReader {
  return (file: string): string | undefined => {
    try {
      return readFileSync(isAbsolute(file) ? file : resolve(rootDir, file), 'utf8');
    } catch {
      return undefined;
    }
  };
}

export function defaultProject(rootDir: string): string {
  return basename(resolve(rootDir));
}
