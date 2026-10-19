import { SyncActionEnum } from '../../../types/sync.types';

export const SYNC_ACTIONS = {
  CREATED: SyncActionEnum.CREATED,
  UPDATED: SyncActionEnum.UPDATED,
  SKIPPED: SyncActionEnum.SKIPPED,
  DELETED: SyncActionEnum.DELETED,
} as const;

export const SKIP_REASONS = {
  DRY_RUN: 'Dry run mode',
  NO_CHANGES: 'No changes detected',
} as const;
