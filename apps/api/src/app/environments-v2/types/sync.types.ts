import { UserSessionData } from '@novu/shared';
import { ClientSession } from '@novu/dal';

export enum ResourceTypeEnum {
  WORKFLOW = 'workflow',
  STEP = 'step',
  LOCALIZATION_GROUP = 'localization_group',
  LAYOUT = 'layout',
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
  session?: ClientSession | null;
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
  MOVED = 'moved',
}

export interface IUserInfo {
  _id: string;
  firstName: string;
  lastName?: string | null;
  externalId?: string;
}

export interface IResourceInfo {
  id: string | null;
  name: string | null;
  updatedBy?: IUserInfo | null;
  updatedAt?: string | null;
}

export interface IResourceDiff {
  sourceResource?: IResourceInfo | null;
  targetResource?: IResourceInfo | null;
  resourceType: ResourceTypeEnum;
  action: DiffActionEnum;
  diffs?: {
    previous: Record<string, any> | null;
    new: Record<string, any> | null;
  };
  // Step-specific fields
  stepType?: string;
  previousIndex?: number;
  newIndex?: number;
}

export interface IDiffResult {
  resourceType: ResourceTypeEnum;
  sourceResource?: IResourceInfo | null;
  targetResource?: IResourceInfo | null;
  changes: IResourceDiff[];
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
