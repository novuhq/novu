export const WORKFLOW_SYNC_CONSTANTS = {
  BATCH_SIZE: 100,
} as const;

export const WORKFLOW_SYNC_ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  SKIPPED: 'skipped',
  DELETED: 'deleted',
} as const;

export const WORKFLOW_SYNC_MESSAGES = {
  STARTING_SYNC: (sourceEnvId: string, targetEnvId: string) =>
    `Starting workflow sync from ${sourceEnvId} to ${targetEnvId}`,
  FOUND_WORKFLOWS: (count: number) => `Found ${count} workflows to sync`,
  DRY_RUN_MODE: 'Dry run mode - no actual sync will be performed',
  SYNC_SUCCESS: (name: string, action: string) => `Successfully synced workflow: ${name} (${action})`,
  SYNC_SKIP: (name: string, action: string) => `Skipped workflow: ${name} (${action})`,
  SYNC_FAILED: (name: string, error: string) => `Failed to sync workflow ${name}: ${error}`,
  DELETE_SUCCESS: (name: string) => `Successfully deleted workflow: ${name} (removed from source)`,
  DELETE_FAILED: (name: string, error: string) => `Failed to delete workflow ${name}: ${error}`,
  STARTING_DIFF: (sourceEnvId: string, targetEnvId: string) =>
    `Starting workflow diff between ${sourceEnvId} and ${targetEnvId}`,
  COMPARE_FAILED: (error: string) => `Failed to compare workflows: ${error}`,
  SYNC_COMPLETE_FAILED: (error: string) => `Workflow sync failed: ${error}`,
  DIFF_COMPLETE_FAILED: (error: string) => `Workflow diff failed: ${error}`,
} as const;

export const SKIP_REASONS = {
  DRY_RUN: 'Dry run mode',
  NO_CHANGES: 'No changes detected',
} as const;
