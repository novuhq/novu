import { MemberRoleEnum } from '@notifire/shared';
import { api } from './api.client';

export function getOrganizationMembers() {
  return api.get(`/v1/organizations/members`);
}

export function getCurrentOrganization() {
  return api.get(`/v1/organizations/me`);
}

export function inviteMember(email: string) {
  return api.post(`/v1/invites`, {
    email,
    role: MemberRoleEnum.ADMIN,
  });
}
