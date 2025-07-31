import { isClerkEnabled } from '@novu/shared';
import { CreateOrganization } from './create-organization/create-organization.usecase';
import { SyncExternalOrganization } from './create-organization/sync-external-organization/sync-external-organization.usecase';
import { GetMyOrganization } from './get-my-organization/get-my-organization.usecase';
import { GetOrganization } from './get-organization/get-organization.usecase';
import { GetOrganizationSettings } from './get-organization-settings/get-organization-settings.usecase';
import { GetOrganizations } from './get-organizations/get-organizations.usecase';
import { AddMember } from './membership/add-member/add-member.usecase';
import { ChangeMemberRole } from './membership/change-member-role/change-member-role.usecase';
import { GetMembers } from './membership/get-members/get-members.usecase';
import { RemoveMember } from './membership/remove-member/remove-member.usecase';
import { RenameOrganization } from './rename-organization/rename-organization.usecase';
import { UpdateBrandingDetails } from './update-branding-details/update-branding-details.usecase';
import { UpdateOrganizationSettings } from './update-organization-settings/update-organization-settings.usecase';

// TODO: move ee.organization.controller.ts to EE package
function getEnterpriseUsecases() {
  if (isClerkEnabled()) {
    return [
      {
        provide: 'SyncOrganizationUsecase',
        useClass: SyncExternalOrganization,
      },
    ];
  }

  return [];
}

export const USE_CASES = [
  AddMember,
  CreateOrganization,
  GetOrganization,
  GetMembers,
  RemoveMember,
  ChangeMemberRole,
  UpdateBrandingDetails,
  GetOrganizations,
  GetMyOrganization,
  RenameOrganization,
  GetOrganizationSettings,
  UpdateOrganizationSettings,
  ...getEnterpriseUsecases(),
];
