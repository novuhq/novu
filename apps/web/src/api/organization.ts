import { MemberRoleEnum } from '@novu/shared';
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
    role: MemberRoleEnum.MEMBER,
  });
}

export function resendInviteMember(memberId: string) {
  return api.post(`/v1/invites/resend`, {
    memberId,
  });
}

export function changeMemberRole(memberId: string, memberRole: MemberRoleEnum) {
  return api.put(`/v1/organizations/members/${memberId}/roles`, {
    role: memberRole,
  });
}

export function removeMember(memberId: string) {
  return api.delete(`/v1/organizations/members/${memberId}`);
}

export function updateBrandingSettings(payload: { color: string | undefined; logo: string | undefined }) {
  return api.put(`/v1/organizations/branding`, payload);
}
