import { api } from './api.client';

export async function getChanges() {
  return api.get('/v1/changes');
}

export async function getPromotedChanges() {
  return api.get('/v1/changes?promoted=true');
}

export async function getUnpromotedChanges() {
  return api.get('/v1/changes?promoted=false');
}

export async function getChangesCount() {
  return api.get('/v1/changes/count');
}

export async function promoteChange(changeId: string) {
  return api.post(`/v1/changes/${changeId}/apply`, {});
}

export async function bulkPromoteChanges(changeIds: string[]) {
  return api.post(`/v1/changes/bulk/apply`, changeIds);
}
