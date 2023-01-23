import { api } from './api.client';

export function validateMxRecord(): Promise<{ data: { mxRecordConfigured: boolean } }> {
  return api.get(`/v1/inbound-parse/mx/status`);
}
