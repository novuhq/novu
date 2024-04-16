import { MemberRoleEnum } from '@novu/shared';
import { api } from './api.client';

export type OrgColorType = string;

export type UpdateOrgBrandingPayloadType = {
  logo?: string;
  color?: OrgColorType;
  fontColor?: OrgColorType;
  fontFamily?: string;
  contentBackgroundValue?: string;
};

export function getOrganizations() {
  return api.get(`/v1/organizations`);
}

export function addOrganization(name: string) {
  return api.post(`/v1/organizations`, {
    name,
  });
}

export function switchOrganization(organizationId: string) {
  return api.post(`/v1/auth/organizations/${organizationId}/switch`, {});
}

export function getOrganizationMembers() {
  return api.get(`/v1/organizations/members`);
}

export function inviteMember(email: string) {
  return api.post(`/v1/invites`, {
    email,
    role: MemberRoleEnum.ADMIN,
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

export function updateBrandingSettings(payload: UpdateOrgBrandingPayloadType) {
  return api.put(`/v1/organizations/branding`, payload);
}

export function renameOrganization(organizationName: string) {
  return api.patch(`/v1/organizations`, { name: organizationName });
}
