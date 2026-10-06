const DIRECTIVE_PATTERNS = [
  /^\s*eslint(-disable|-enable|-env)?(-next-line|-line)?(\s|$)/,
  /^\s*eslint\s/,
  /^\s*globals?\s/,
  /^\s*exported\s/,
  /^\s*@ts-(expect-error|ignore|nocheck|check)\b/,
  /^\s*prettier-ignore\b/,
  /^\s*(istanbul|c8|v8)\s+ignore\b/,
  /^\s*webpack[A-Z]\w*\s*:/,
  /^\s*@vite-ignore\b/,
  /^\s*[#@]__(PURE|NO_SIDE_EFFECTS)__\s*$/,
  /^\s*@(jest|vitest)-environment\b/,
  /^\s*jscpd:/,
  /^\s*biome-ignore\b/,
  /^\/\s*<(reference|amd-module)\b/,
];

const JSDOC_TYPE_TAGS = new Set([
  'type',
  'typedef',
  'satisfies',
  'import',
  'callback',
  'template',
  'property',
  'jsx',
  'jsxImportSource',
  'jsxFrag',
  'jsxRuntime',
]);

const BLOCK_TAG = /^@([A-Za-z][\w-]*)/;

function isDocBlock(comment) {
  return comment.type === 'Block' && comment.value.startsWith('*') && comment.value !== '*';
}

function docBodyLines(comment) {
  return comment.value
    .slice(1)
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^\*+\s?/, '').trim())
    .filter((line) => line.length > 0);
}

function blockTags(lines) {
  const tags = [];
  for (const line of lines) {
    const match = BLOCK_TAG.exec(line);
    if (match) tags.push(match[1]);
  }

  return tags;
}

function isTypeAnnotationDoc(comment) {
  if (!isDocBlock(comment)) return false;
  const lines = docBodyLines(comment);
  if (lines.length === 0) return false;
  const allTagged = lines.every((line) => BLOCK_TAG.test(line));
  const tags = blockTags(lines);

  return allTagged && tags.every((tag) => JSDOC_TYPE_TAGS.has(tag));
}

function compileAllow(allow) {
  return (allow ?? []).map((source) => new RegExp(source));
}

function isDirective(comment, extraPatterns) {
  if (comment.type === 'Shebang') return true;
  const patterns = extraPatterns ? DIRECTIVE_PATTERNS.concat(extraPatterns) : DIRECTIVE_PATTERNS;

  return patterns.some((pattern) => pattern.test(comment.value));
}

function removalRange(sourceCode, comment) {
  const text = sourceCode.text;
  let start = comment.range[0];
  let end = comment.range[1];
  while (start > 0 && (text[start - 1] === ' ' || text[start - 1] === '\t')) start--;
  const ownLine = start === 0 || text[start - 1] === '\n';
  if (ownLine) {
    if (text[end] === '\r') end++;
    if (text[end] === '\n') end++;
  }

  return [start, end];
}

function removeSuggestion(sourceCode, comment) {
  return {
    messageId: 'removeComment',
    fix: (fixer) => fixer.removeRange(removalRange(sourceCode, comment)),
  };
}

export {
  blockTags,
  compileAllow,
  docBodyLines,
  isDirective,
  isDocBlock,
  isTypeAnnotationDoc,
  removeSuggestion,
};
