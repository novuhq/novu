export const SYNC_CONSTANTS = {
  BATCH_SIZE: 100,
} as const;

export const SYNC_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  SKIPPED: 'skipped',
  DELETED: 'deleted',
} as const;

export const SKIP_REASONS = {
  DRY_RUN: 'Dry run mode',
  NO_CHANGES: 'No changes detected',
} as const;
