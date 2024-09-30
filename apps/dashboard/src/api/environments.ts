import type { IEnvironment } from '@novu/shared';
import { get } from './api.client';

export async function getEnvironments() {
  const { data } = await get<{ data: IEnvironment[] }>('/environments');

  return data;
}

export async function getCurrentEnvironment() {
  const { data } = await get<{ data: IEnvironment }>('/environments/me');

  return data;
}
