import { blockTags, docBodyLines, isDocBlock, isTypeAnnotationDoc } from './comment-utils.js';

const DEFAULT_MAX = 3;
const DEFAULT_ALLOWED_TAGS = ['param', 'returns'];

const docCommentMaxLinesRule = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Cap a doc comment at a few lines and allow only @param / @returns block tags (RV-1, D-CMT-3)',
    },
    schema: [
      {
        type: 'object',
        properties: {
          max: { type: 'integer', minimum: 1 },
          allowedTags: { type: 'array', items: { type: 'string' } },
          bannedTags: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      tooLong: 'RV-1: doc comment is {{actual}} lines; the cap is {{max}}.',
      bannedTag: 'RV-1: @{{tag}} is not allowed in a doc comment (allowed: {{allowed}}).',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const options = context.options[0] ?? {};
    const max = options.max ?? DEFAULT_MAX;
    const allowed = new Set(options.allowedTags ?? DEFAULT_ALLOWED_TAGS);
    for (const tag of options.bannedTags ?? []) allowed.delete(tag);
    const allowedText = [...allowed].map((tag) => `@${tag}`).join(', ') || 'none';

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (!isDocBlock(comment) || isTypeAnnotationDoc(comment)) continue;
          const lines = docBodyLines(comment);
          if (lines.length > max)
            context.report({
              loc: comment.loc,
              messageId: 'tooLong',
              data: { actual: String(lines.length), max: String(max) },
            });
          for (const tag of blockTags(lines))
            if (!allowed.has(tag))
              context.report({
                loc: comment.loc,
                messageId: 'bannedTag',
                data: { tag, allowed: allowedText },
              });
        }
      },
    };
  },
};

export default { rules: { 'doc-comment-max-lines': docCommentMaxLinesRule } };
