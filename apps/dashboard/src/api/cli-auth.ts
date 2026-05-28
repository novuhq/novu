import type { IEnvironment } from '@novu/shared';
import { post } from './api.client';

type ApproveCliDeviceSessionPayload = {
  apiKey: string;
  environmentId: string;
  environmentSlug?: string | null;
  environmentName?: string | null;
  organizationId?: string | null;
  user?: {
    id: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

export async function approveCliDeviceSession(
  deviceCode: string,
  payload: ApproveCliDeviceSessionPayload,
  environment?: IEnvironment
): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>(`/cli/device-sessions/${encodeURIComponent(deviceCode)}/approve`, {
    body: payload,
    environment,
  });
}
