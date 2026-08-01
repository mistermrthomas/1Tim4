export type StoreName =
  | 'profiles'
  | 'entities'
  | 'daily_plans'
  | 'drafts'
  | 'outbox'
  | 'content_packs'
  | 'scripture_texts'
  | 'meta';

export type IndexQuery =
  | { type: 'all' }
  | { type: 'prefix'; field: string; prefix: string };

export const DB_NAME = 'formation_local_v1';
export const DB_VERSION = 1;
