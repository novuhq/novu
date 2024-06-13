import { OrganizationMembership } from '@clerk/clerk-sdk-node';
import {
  GetOrganizationMembershipListParams,
  Organization,
  UpdateOrganizationParams,
} from './clerk.organization.types';
import { UpdateUserParams, User, UserListParams } from './clerk.user.types';

export interface IUserAPI {
  updateUser(userId: string, params?: UpdateUserParams): Promise<User>;
  getUser(userId: string): Promise<User>;
  getUserList(params?: UserListParams): Promise<PaginatedResourceResponse<User[]>>;
  deleteUser(userId: string): Promise<User>;
}

export interface IOrganizationAPI {
  getOrganization(organizationId: string): Promise<Organization>;
  getOrganizationMembershipList(
    params: GetOrganizationMembershipListParams
  ): Promise<PaginatedResourceResponse<OrganizationMembership[]>>;
  updateOrganization(organizationId: string, params?: UpdateOrganizationParams): Promise<Organization>;
  deleteOrganization(organizationId: string): Promise<Organization>;
}

type PaginatedResourceResponse<T> = {
  data: T;
  totalCount: number;
};
