import { UserSessionData } from '@novu/shared';

export enum EntityTypeEnum {
  WORKFLOW = 'workflow',
}

export interface ISyncOptions {
  dryRun?: boolean;
  skipExisting?: boolean;
  includeInactive?: boolean;
  batchSize?: number;
}

export interface ISyncContext {
  sourceEnvironmentId: string;
  targetEnvironmentId: string;
  user: UserSessionData;
  options: ISyncOptions;
}

export interface ISyncedEntity {
  entityType: EntityTypeEnum;
  entityId: string;
  entityName: string;
  action: 'created' | 'updated' | 'skipped';
  duration: number;
}

export interface IFailedEntity {
  entityType: EntityTypeEnum;
  entityId: string;
  entityName: string;
  error: string;
  stack?: string;
}

export interface ISkippedEntity {
  entityType: EntityTypeEnum;
  entityId: string;
  entityName: string;
  reason: string;
}

export interface ISyncResult {
  entityType: EntityTypeEnum;
  successful: ISyncedEntity[];
  failed: IFailedEntity[];
  skipped: ISkippedEntity[];
  totalProcessed: number;
  totalTime: number;
}

export interface IPublishResult {
  results: ISyncResult[];
  summary: {
    totalEntities: number;
    totalSuccessful: number;
    totalFailed: number;
    totalSkipped: number;
    totalDuration: number;
  };
}

export enum DiffActionEnum {
  ADDED = 'added',
  MODIFIED = 'modified',
  DELETED = 'deleted',
  UNCHANGED = 'unchanged',
}

export interface IEntityDiff {
  entityId: string;
  entityName: string;
  action: DiffActionEnum;
  changes?: Record<
    string,
    {
      old: any;
      new: any;
    }
  >;
}

export interface IDiffResult {
  entityType: EntityTypeEnum;
  diffs: IEntityDiff[];
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
  results: IDiffResult[];
  summary: {
    totalEntities: number;
    totalChanges: number;
    hasChanges: boolean;
  };
}

export interface ISyncStrategy {
  getEntityType(): EntityTypeEnum;
  execute(context: ISyncContext): Promise<ISyncResult>;
  diff(sourceEnvId: string, targetEnvId: string, organizationId: string): Promise<IDiffResult>;
}

export interface ISyncProgress {
  entityType: EntityTypeEnum;
  total: number;
  processed: number;
  failed: number;
  currentEntity?: string;
  estimatedTimeRemaining?: number;
}
