import { OrganizationMembership } from './clerk.organization-membership.types';
import {
  GetOrganizationMembershipListParams,
  Organization,
  UpdateOrganizationParams,
  UpdateMetadataParams,
} from './clerk.organization.types';
import { UpdateUserParams, User, UserListParams } from './clerk.user.types';

export interface IUserAPI {
  updateUser(userId: string, params?: UpdateUserParams): Promise<User>;
  getUser(userId: string): Promise<User>;
  getUserList(params?: UserListParams): Promise<PaginatedResourceResponse<User[]>>;
  deleteUser(userId: string): Promise<User>;
}

export interface IOrganizationAPI {
  getOrganization(params: { organizationId: string }): Promise<Organization>;
  getOrganizationMembershipList(
    params: GetOrganizationMembershipListParams
  ): Promise<PaginatedResourceResponse<OrganizationMembership[]>>;
  updateOrganization(organizationId: string, params?: UpdateOrganizationParams): Promise<Organization>;
  updateOrganizationMetadata(organizationId: string, params: UpdateMetadataParams): Promise<Organization>;
  deleteOrganization(organizationId: string): Promise<Organization>;
}

type PaginatedResourceResponse<T> = {
  data: T;
  totalCount: number;
};
