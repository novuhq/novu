import type { UserSessionData } from '@novu/shared';

export interface KeylessWorkflowCopyScope {
  sourceEnvironmentId: string;
  sourceOrganizationId: string;
  targetEnvironmentId: string;
  targetOrganizationId: string;
}

export interface KeylessWorkflowPreflightResult {
  toCopy: string[];
  skipped: string[];
}

export interface CopyKeylessWorkflowsCommand extends KeylessWorkflowCopyScope {
  /** The claimer. Its organization and environment are swapped per side of the copy. */
  user: UserSessionData;
  workflowIds: string[];
}

export interface CopyKeylessWorkflowsResult {
  copiedInternalIds: string[];
  copied: string[];
  skipped: string[];
}

export interface CompensateKeylessWorkflowCopyCommand {
  user: UserSessionData;
  targetEnvironmentId: string;
  targetOrganizationId: string;
  copiedInternalIds: string[];
}
