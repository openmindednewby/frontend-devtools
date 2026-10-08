import { QUOTES, skipString } from './sourceRequirements';

interface OpenDescribe {
  title: string;
  depth: number;
}

const BLOCK_RE = /\b(describe(?:\.\w+)?|(?:it|test)\.failing)\(\s*(['"`])((?:\\.|(?!\2)[^\\])*)\2/g;
const DESCRIBE = 'describe';

export const KEY_SEPARATOR = ' > ';

function closeBlocks(open: OpenDescribe[], depth: number): void {
  while (open.length > 0 && (open[open.length - 1]?.depth ?? -1) >= depth) {
    open.pop();
  }
}

/**
 * Finds every literal `it.failing` / `test.failing` with its describe chain.
 * @returns keys of the form "describe > ... > title"
 */
export function failingKeys(source: string | undefined): Set<string> {
  const text = source ?? '';
  const matches = [...text.matchAll(BLOCK_RE)];
  const keys = new Set<string>();
  const open: OpenDescribe[] = [];
  let next = 0;
  let depth = 0;
  let i = 0;
  while (i < text.length) {
    while (next < matches.length && (matches[next]?.index ?? 0) < i) {
      next += 1;
    }
    const match = matches[next];
    if (match !== undefined && match.index === i) {
      const title = match[3] ?? '';
      if ((match[1] ?? '').startsWith(DESCRIBE)) {
        open.push({ title, depth });
      } else {
        keys.add([...open.map((block) => block.title), title].join(KEY_SEPARATOR));
      }
      i += match[0].length;
      continue;
    }
    const ch = text[i] ?? '';
    if (QUOTES.includes(ch)) {
      i = skipString(text, i);
      continue;
    }
    depth += ch === '{' ? 1 : 0;
    if (ch === '}') {
      depth -= 1;
      closeBlocks(open, depth);
    }
    i += 1;
  }
  return keys;
}
