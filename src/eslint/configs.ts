import type { FlatConfig } from './types';

import { plugin } from './plugin';

const DOC_COMMENT_MAX_LINES = 3;

export const COMMENT_RULE_NAMES: readonly string[] = [
  'no-comments',
  'doc-comment-public-only',
  'doc-comment-max-lines',
];

/** Flat-config block for COMMENTS-1: no code comments, short doc comments on public members only. */
export const commentsConfig: FlatConfig = {
  plugins: { '@dloizides': plugin as unknown as NonNullable<FlatConfig['plugins']>[string] },
  rules: {
    '@dloizides/no-comments': 'error',
    '@dloizides/doc-comment-public-only': 'error',
    '@dloizides/doc-comment-max-lines': ['error', { max: DOC_COMMENT_MAX_LINES }],
  },
};
