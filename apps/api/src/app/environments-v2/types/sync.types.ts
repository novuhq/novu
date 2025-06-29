import { UserSessionData } from '@novu/shared';

export enum ResourceTypeEnum {
  WORKFLOW = 'workflow',
  STEP = 'step',
}

export interface ISyncOptions {
  dryRun?: boolean;
  batchSize?: number;
}

export interface ISyncContext {
  sourceEnvironmentId: string;
  targetEnvironmentId: string;
  user: UserSessionData;
  options: ISyncOptions;
}

export interface ISyncedEntity {
  resourceType: ResourceTypeEnum;
  resourceId: string;
  resourceName: string;
  action: 'created' | 'updated' | 'skipped' | 'deleted';
}

export interface IFailedEntity {
  resourceType: ResourceTypeEnum;
  resourceId: string;
  resourceName: string;
  error: string;
  stack?: string;
}

export interface ISkippedEntity {
  resourceType: ResourceTypeEnum;
  resourceId: string;
  resourceName: string;
  reason: string;
}

export interface ISyncResult {
  resourceType: ResourceTypeEnum;
  successful: ISyncedEntity[];
  failed: IFailedEntity[];
  skipped: ISkippedEntity[];
  totalProcessed: number;
}

export interface IPublishResult {
  results: ISyncResult[];
  summary: {
    resources: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

export enum DiffActionEnum {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  UNCHANGED = 'unchanged',
  STEP_ADDED = 'stepAdded',
  STEP_MODIFIED = 'stepModified',
  STEP_DELETED = 'stepDeleted',
  STEP_MOVED = 'stepMoved',
}

export interface IResourceDiff {
  sourceResourceId: string | null;
  sourceResourceName: string | null;
  targetResourceId: string | null;
  targetResourceName: string | null;
  resourceType: ResourceTypeEnum;
  action: DiffActionEnum;
  changes?: {
    previous: Record<string, any>;
    new: Record<string, any>;
  };
  // Step-specific fields
  stepType?: string;
  workflowId?: string;
  workflowName?: string;
  previousIndex?: number;
  newIndex?: number;
}

export interface IDiffResult {
  resourceType: ResourceTypeEnum;
  sourceResourceId: string | null;
  sourceResourceName: string | null;
  targetResourceId: string | null;
  targetResourceName: string | null;
  diffs: IResourceDiff[];
  summary: {
    added: number;
    modified: number;
    deleted: number;
    unchanged: number;
  };
}

export interface IEnvironmentDiffResult {
  sourceEnvironmentId: string;
  targetEnvironmentId: string;
  resources: IDiffResult[];
  summary: {
    totalEntities: number;
    totalChanges: number;
    hasChanges: boolean;
  };
}

export interface ISyncStrategy {
  getResourceType(): ResourceTypeEnum;
  execute(context: ISyncContext): Promise<ISyncResult>;
  diff(
    sourceEnvId: string,
    targetEnvId: string,
    organizationId: string,
    userContext: UserSessionData
  ): Promise<IDiffResult[]>;
}

export interface ISyncProgress {
  resourceType: ResourceTypeEnum;
  total: number;
  processed: number;
  failed: number;
  currentEntity?: string;
  estimatedTimeRemaining?: number;
}
