import type { IEnvironment } from '@novu/shared';
import { get, put } from './api.client';

export async function getEnvironments() {
  const { data } = await get<{ data: IEnvironment[] }>('/environments');

  return data;
}

export async function updateBridgeUrl(payload: { url: string | undefined }, environmentId: string) {
  return put(`/environments/${environmentId}`, { bridge: payload });
}
