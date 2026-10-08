import type { RequirementRecord, SourceReader } from '../types';
import { relativePath } from './paths';

const CALL_RE = /\brequirements\(\s*\{([\s\S]*?)\}\s*\)/g;
const ENTRY_RE = /(['"`]?)([A-Za-z][\w-]*)\1\s*:\s*(['"`])((?:\\.|(?!\3)[^\\])*)\3/g;

/**
 * Reads every literal `requirements({...})` call in a source file.
 * @returns the requirements in declaration order
 */
export function parseRequirements(source: string, file: string): RequirementRecord[] {
  const found: RequirementRecord[] = [];
  for (const call of source.matchAll(CALL_RE)) {
    const body = call[1] ?? '';
    for (const entry of body.matchAll(ENTRY_RE)) {
      found.push({ id: entry[2] ?? '', title: entry[4] ?? '', source: file });
    }
  }
  return found;
}

export function requirementsFromFiles(
  files: string[],
  readSource: SourceReader,
  rootDir: string,
): RequirementRecord[] {
  const byId = new Map<string, RequirementRecord>();
  for (const file of new Set(files)) {
    const source = readSource(file);
    if (source === undefined) {
      continue;
    }
    for (const requirement of parseRequirements(source, relativePath(rootDir, file))) {
      if (!byId.has(requirement.id)) {
        byId.set(requirement.id, requirement);
      }
    }
  }
  return [...byId.values()];
}
