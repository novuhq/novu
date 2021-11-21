import { api } from './api.client';

export function getInviteTokenData(token: string) {
  return api.get(`/v1/invites/${token}`);
}
