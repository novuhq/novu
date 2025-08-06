import { IApiKey, IEnvironment, ITagsResponse } from '@novu/shared';
import { del, get, getV2, post, postV2, put } from './api.client';

export interface IDiffSummary {
  added: number;
  modified: number;
  deleted: number;
  unchanged: number;
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

export interface IResourceDependency {
  resourceType: string;
  resourceId: string;
  resourceName: string;
  isBlocking: boolean;
  reason: 'LAYOUT_REQUIRED_FOR_WORKFLOW' | 'LAYOUT_EXISTS_IN_TARGET';
}

export interface IResourceDiffResult {
  resourceType: string;
  sourceResource?: IResourceInfo | null;
  targetResource?: IResourceInfo | null;
  changes: any[];
  summary: IDiffSummary;
  dependencies?: IResourceDependency[];
}

export interface IEnvironmentDiffResponse {
  sourceEnvironmentId: string;
  targetEnvironmentId: string;
  resources: IResourceDiffResult[];
  summary: {
    totalEntities: number;
    totalChanges: number;
    hasChanges: boolean;
  };
}

export interface IEnvironmentPublishResponse {
  sourceEnvironmentId?: string;
  targetEnvironmentId?: string;
  results: Array<{
    resourceType: string;
    successful: Array<{
      resourceType: string;
      resourceId: string;
      resourceName: string;
      action: string;
    }>;
    failed: Array<{
      resourceType: string;
      resourceId: string;
      resourceName: string;
      error: string;
    }>;
    skipped: Array<{
      resourceType: string;
      resourceId: string;
      resourceName: string;
      reason: string;
    }>;
    totalProcessed: number;
  }>;
  summary: {
    resources: number;
    successful: number;
    failed: number;
    skipped: number;
  };
}

export type ResourceToPublish = {
  resourceType: 'workflow' | 'layout' | 'localization_group' | 'step';
  resourceId: string;
};

export async function getEnvironments() {
  const { data } = await get<{ data: IEnvironment[] }>('/environments');
  return data;
}

export async function updateEnvironment({
  environment,
  name,
  color,
}: {
  environment: IEnvironment;
  name: string;
  color?: string;
}) {
  return put<{ data: IEnvironment }>(`/environments/${environment._id}`, { body: { name, color } });
}

export async function updateBridgeUrl({ environment, url }: { environment: IEnvironment; url?: string }) {
  return put(`/environments/${environment._id}`, { body: { bridge: { url } } });
}

export async function getApiKeys({ environment }: { environment: IEnvironment }): Promise<{ data: IApiKey[] }> {
  // TODO: This is a technical debt on the API side.
  // This endpoints should be /environments/:environmentId/api-keys
  return get<{ data: IApiKey[] }>(`/environments/api-keys`, { environment });
}

export async function getTags({ environment }: { environment: IEnvironment }): Promise<ITagsResponse> {
  const { data } = await getV2<{ data: ITagsResponse }>(`/environments/${environment._id}/tags`);
  return data;
}

export async function createEnvironment(payload: { name: string; color: string }): Promise<IEnvironment> {
  const response = await post<{ data: IEnvironment }>('/environments', { body: payload });

  return response.data;
}

export async function deleteEnvironment({ environment }: { environment: IEnvironment }): Promise<void> {
  return del(`/environments/${environment._id}`);
}

export async function regenerateApiKeys({ environment }: { environment: IEnvironment }): Promise<{ data: IApiKey[] }> {
  return post<{ data: IApiKey[] }>(`/environments/api-keys/regenerate`, { environment });
}

export async function diffEnvironments({
  sourceEnvironmentId,
  targetEnvironmentId,
}: {
  sourceEnvironmentId: string;
  targetEnvironmentId: string;
}): Promise<IEnvironmentDiffResponse> {
  const { data } = await postV2<{ data: IEnvironmentDiffResponse }>(`/environments/${targetEnvironmentId}/diff`, {
    body: { sourceEnvironmentId },
  });
  return data;
}

export async function publishEnvironments({
  sourceEnvironmentId,
  targetEnvironmentId,
  resources,
}: {
  sourceEnvironmentId: string;
  targetEnvironmentId: string;
  resources?: ResourceToPublish[];
}): Promise<IEnvironmentPublishResponse> {
  const { data } = await postV2<{ data: IEnvironmentPublishResponse }>(`/environments/${targetEnvironmentId}/publish`, {
    body: {
      sourceEnvironmentId,
      dryRun: false,
      ...(resources && { resources }),
    },
  });
  return data;
}
