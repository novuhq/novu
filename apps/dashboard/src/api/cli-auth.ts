import type { ApproveCliDeviceSessionRequest } from '@novu/shared';
import { post } from './api.client';

export async function approveCliDeviceSession(
  deviceCode: string,
  payload: ApproveCliDeviceSessionRequest
): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>(`/cli/device-sessions/${encodeURIComponent(deviceCode)}/approve`, {
    body: payload,
  });
}
