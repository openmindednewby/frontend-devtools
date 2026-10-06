import { compileAllow, isDirective, isDocBlock, removeSuggestion } from './comment-utils.js';

const noCommentsRule = {
  meta: {
    type: 'suggestion',
    hasSuggestions: true,
    docs: {
      description:
        'Disallow code comments: intent goes in names, rules in test names, context in the task doc and commit (RV-2)',
    },
    schema: [
      {
        type: 'object',
        properties: { allow: { type: 'array', items: { type: 'string' } } },
        additionalProperties: false,
      },
    ],
    messages: {
      noComment:
        'RV-2: no code comments. Put intent in names, business rules in test names, context in the task doc or commit message.',
      removeComment: 'Remove this comment.',
    },
  },

  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    const extra = compileAllow(context.options[0]?.allow);

    return {
      Program() {
        for (const comment of sourceCode.getAllComments()) {
          if (isDocBlock(comment) || isDirective(comment, extra)) continue;
          context.report({
            loc: comment.loc,
            messageId: 'noComment',
            suggest: [removeSuggestion(sourceCode, comment)],
          });
        }
      },
    };
  },
};

export default { rules: { 'no-comments': noCommentsRule } };
