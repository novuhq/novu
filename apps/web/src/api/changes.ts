import { api } from './api.client';

export async function getChanges() {
  return api.get('/v1/changes');
}

export async function getPromotedChanges() {
  return api.get('/v1/changes/history');
}

export async function getUnpromotedChanges() {
  return api.get('/v1/changes/current');
}

export async function getChangesCount() {
  return api.get('/v1/changes/count');
}

export async function promoteChange(changeId: string) {
  return api.put(`/v1/changes/${changeId}/enabled`, {});
}
