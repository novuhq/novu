import { Organization as ClerkOrganization } from '@clerk/clerk-sdk-node';
import { ClerkPaginationRequest } from '@clerk/types';

export type Organization = ClerkOrganization & OrganizationMetadataParams;

export type CreateOrganizationParams = {
  name: string;
  slug?: string;
  createdBy: string;
  maxAllowedMemberships?: number;
} & OrganizationMetadataParams;

export type UpdateOrganizationParams = {
  name?: string;
  slug?: string;
  maxAllowedMemberships?: number;
} & OrganizationMetadataParams;

export type UpdateMetadataParams = OrganizationMetadataParams;

type OrganizationPublicMetadata = {
  externalOrgId?: string;
};

type OrganizationMetadataParams = {
  publicMetadata?: OrganizationPublicMetadata;
  privateMetadata?: OrganizationPrivateMetadata;
};

export type GetOrganizationMembershipListParams = ClerkPaginationRequest<{
  organizationId: string;
  orderBy?: WithSign<'phone_number' | 'email_address' | 'created_at' | 'first_name' | 'last_name' | 'username'>;
}>;

type WithSign<T extends string> = `+${T}` | `-${T}` | T;
