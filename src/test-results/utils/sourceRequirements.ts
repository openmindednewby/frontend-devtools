import type { RequirementRecord, SourceReader } from '../types';
import { REQUIREMENT_ID } from '../constants';
import { relativePath } from './paths';

export interface RequirementProblem {
  file: string;
  line: number;
  text: string;
}

export interface ParsedRequirements {
  requirements: RequirementRecord[];
  problems: RequirementProblem[];
}

interface Piece {
  text: string;
  offset: number;
}

const CALL_RE = /\brequirements\(\s*\{/g;
const KEY_RE = new RegExp(`^(['"\`]?)(${REQUIREMENT_ID})\\1$`);
const QUOTES = '\'"`';
const ESCAPE_RE = /\\(.)/g;
const TEMPLATE_HOLE = '${';

function skipString(src: string, start: number): number {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length && src[i] !== quote) {
    i += src[i] === '\\' ? 2 : 1;
  }
  return i + 1;
}

function splitTopLevel(src: string, from: number, offsetBase: number): { pieces: Piece[]; end: number } {
  const pieces: Piece[] = [];
  let depth = 0;
  let pieceStart = from;
  let i = from;
  while (i < src.length) {
    const ch = src[i] ?? '';
    if (QUOTES.includes(ch)) {
      i = skipString(src, i);
      continue;
    }
    const closesCall = ch === '}' && depth === 0;
    if (closesCall || (ch === ',' && depth === 0)) {
      pieces.push({ text: src.slice(pieceStart, i), offset: offsetBase + pieceStart });
      pieceStart = i + 1;
    }
    if (closesCall) {
      return { pieces, end: i };
    }
    depth += '{[('.includes(ch) ? 1 : 0;
    depth -= '}])'.includes(ch) ? 1 : 0;
    i += 1;
  }
  return { pieces, end: src.length };
}

function literal(value: string): string | undefined {
  const quote = value[0] ?? '';
  const isSingleString = QUOTES.includes(quote) && value.length >= 2 && skipString(value, 0) === value.length;
  if (!isSingleString || (quote === '`' && value.includes(TEMPLATE_HOLE))) {
    return undefined;
  }
  return value.slice(1, -1).replace(ESCAPE_RE, '$1');
}

function entryOf(piece: Piece, file: string): RequirementRecord | undefined {
  const text = piece.text.trim();
  const colon = text.search(/:(?=(?:[^'"`]|['"`][^'"`]*['"`])*$)/);
  const key = KEY_RE.exec(text.slice(0, Math.max(colon, 0)).trim());
  const title = colon < 0 ? undefined : literal(text.slice(colon + 1).trim());
  return key !== null && title !== undefined ? { id: key[2] ?? '', title, source: file } : undefined;
}

function lineAt(source: string, offset: number): number {
  return source.slice(0, offset).split('\n').length;
}

/**
 * Reads every literal `requirements({...})` call in a source file.
 * @returns the requirements in declaration order, plus every entry that is not a string literal
 */
export function parseRequirements(source: string, file: string): ParsedRequirements {
  const parsed: ParsedRequirements = { requirements: [], problems: [] };
  for (const call of source.matchAll(CALL_RE)) {
    const bodyStart = (call.index ?? 0) + call[0].length;
    for (const piece of splitTopLevel(source, bodyStart, 0).pieces) {
      if (piece.text.trim() === '') {
        continue;
      }
      const entry = entryOf(piece, file);
      const offset = piece.offset + (piece.text.length - piece.text.trimStart().length);
      if (entry === undefined) {
        parsed.problems.push({ file, line: lineAt(source, offset), text: piece.text.trim() });
      } else {
        parsed.requirements.push(entry);
      }
    }
  }
  return parsed;
}

function warn(problem: RequirementProblem): void {
  process.stderr.write(`testdoc: ${problem.file}:${problem.line} requirement skipped, not a literal: ${problem.text}\n`);
}

export interface FileRequirements {
  requirements: RequirementRecord[];
  declaredIn: (file: string) => ReadonlySet<string>;
}

const NONE: ReadonlySet<string> = new Set();

export function requirementsFromFiles(
  files: string[],
  readSource: SourceReader,
  rootDir: string,
): FileRequirements {
  const byId = new Map<string, RequirementRecord>();
  const byFile = new Map<string, ReadonlySet<string>>();
  for (const file of new Set(files)) {
    const source = readSource(file);
    if (source === undefined) {
      continue;
    }
    const parsed = parseRequirements(source, relativePath(rootDir, file));
    parsed.problems.forEach(warn);
    byFile.set(file, new Set(parsed.requirements.map((requirement) => requirement.id)));
    for (const requirement of parsed.requirements) {
      if (!byId.has(requirement.id)) {
        byId.set(requirement.id, requirement);
      }
    }
  }
  return { requirements: [...byId.values()], declaredIn: (file) => byFile.get(file) ?? NONE };
}
