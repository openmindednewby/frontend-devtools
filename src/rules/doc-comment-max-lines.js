import { blockTags, docBodyLines, isDocBlock, isTypeAnnotationDoc } from './comment-utils.js';

const DEFAULT_MAX = 3;
const DEFAULT_ALLOWED_TAGS = ['param', 'returns'];
const DEFAULT_SUMMARY_MAX_LINES = 1;
const DEFAULT_LINE_MAX_CHARS = 120;
const CALL_CHAIN = /(→|->|^Flow\s*:)/i;
const PARAM_LINE = /^@(param|returns?)\b/i;

function firstShapeProblem(lines, limits) {
  if (lines.length > limits.max)
    return { messageId: 'tooLong', data: { actual: String(lines.length), max: String(limits.max) } };
  if (lines.some((line) => CALL_CHAIN.test(line))) return { messageId: 'callChain', data: {} };
  const summary = lines.filter((line) => !PARAM_LINE.test(line)).length;
  if (summary > limits.summaryMaxLines)
    return { messageId: 'summaryTooLong', data: { actual: String(summary), max: String(limits.summaryMaxLines) } };
  const long = lines.find((line) => line.length > limits.lineMaxChars);
  if (long !== undefined)
    return { messageId: 'lineTooLong', data: { actual: String(long.length), max: String(limits.lineMaxChars) } };

  return null;
}

const docCommentMaxLinesRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Cap a doc comment at a few lines, a one-line summary with no call chain, and only @param / @returns tags (RV-1, D-CMT-3, D-CMT-4)',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'integer', minimum: 1 },
          allowedTags: { type: 'array', items: { type: 'string' } },
          bannedTags: { type: 'array', items: { type: 'string' } },
          summaryMaxLines: { type: 'integer', minimum: 1 },
          lineMaxChars: { type: 'integer', minimum: 1 },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooLong: 'RV-1: doc comment is {{actual}} lines; the cap is {{max}}.',
      bannedTag: 'RV-1: @{{tag}} is not allowed in a doc comment (allowed: {{allowed}}).',
      summaryTooLong: 'RV-1: doc summary is {{actual}} lines; it must be one line saying what the member is for.',
      callChain: 'RV-1: no call chain or Flow: in a doc comment; say what the member is for, not how it runs.',
      lineTooLong: 'RV-1: doc line is {{actual}} chars; the cap is {{max}}.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const options = context.options[0] ?? {};
    const limits = {
      max: options.max ?? DEFAULT_MAX,
      summaryMaxLines: options.summaryMaxLines ?? DEFAULT_SUMMARY_MAX_LINES,
      lineMaxChars: options.lineMaxChars ?? DEFAULT_LINE_MAX_CHARS,
    };
    const allowed = new Set(options.allowedTags ?? DEFAULT_ALLOWED_TAGS);
    for (const tag of options.bannedTags ?? []) allowed.delete(tag);
    const allowedText = [...allowed].map((tag) => `@${tag}`).join(', ') || 'none';

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (!isDocBlock(comment) || isTypeAnnotationDoc(comment)) continue;
          const lines = docBodyLines(comment);
          const banned = blockTags(lines).filter((tag) => !allowed.has(tag));
          for (const tag of banned)
            context.report({ loc: comment.loc, messageId: 'bannedTag', data: { tag, allowed: allowedText } });
          if (banned.length > 0) continue;
          const problem = firstShapeProblem(lines, limits);
          if (problem) context.report({ loc: comment.loc, ...problem });
        }
      },
    };
  },
};

export default { rules: { 'doc-comment-max-lines': docCommentMaxLinesRule } };
