import { Framework } from '../Framework';
import type { TestStatus } from '../TestStatus';
import type { TestRecord } from '../types';
import { MS_PER_SECOND, REQUIREMENT_ID } from '../constants';

const COVER_RE = new RegExp(`@(${REQUIREMENT_ID})`, 'g');
const TAG_RE = new RegExp(`\\s*@${REQUIREMENT_ID}`, 'g');
const SCENARIO_SEPARATOR = ', ';
const TRAILING_PUNCTUATION_RE = /[._-]+$/;

export interface RecordInput {
  framework: Framework;
  file: string;
  describePath: string[];
  title: string;
  tags?: string[];
  status: TestStatus;
  expectRed: boolean;
  durationMs: number;
  message?: string;
  stack?: string;
  project: string;
  set: string;
  declared: ReadonlySet<string>;
}

const UNDECLARED_REQUIREMENT_RE = /^[A-Z][A-Z0-9]*-\d+$/;

export function extractCovers(texts: string[], declared: ReadonlySet<string>): string[] {
  const ids = texts.flatMap((text) =>
    [...text.matchAll(COVER_RE)].map((match) => (match[1] ?? '').replace(TRAILING_PUNCTUATION_RE, '')),
  );
  return [...new Set(ids)].filter((id) => declared.has(id) || UNDECLARED_REQUIREMENT_RE.test(id));
}

function splitTitle(title: string): { scenario: string; expected: string } {
  const at = title.indexOf(SCENARIO_SEPARATOR);
  if (at < 0) {
    return { scenario: title, expected: '' };
  }
  return { scenario: title.slice(0, at), expected: title.slice(at + SCENARIO_SEPARATOR.length) };
}

export function buildRecord(input: RecordInput): TestRecord {
  const method = input.title.replace(TAG_RE, '').trim();
  const describes = input.describePath.map((title) => title.replace(TAG_RE, '').trim());
  const suffix = input.framework === Framework.Playwright ? ` [${input.project}]` : '';
  return {
    id: [input.file, ...describes, method].join(' > ') + suffix,
    framework: input.framework,
    project: input.project,
    set: input.set,
    expectRed: input.expectRed,
    feature: describes[0] ?? input.file,
    class: describes[describes.length - 1] ?? input.file,
    method,
    description: [...describes, method].join(' '),
    ...splitTitle(method),
    covers: extractCovers([...(input.tags ?? []), ...input.describePath, input.title], input.declared),
    status: input.status,
    seconds: input.durationMs / MS_PER_SECOND,
    message: input.message ?? '',
    stack: input.stack ?? '',
  };
}
