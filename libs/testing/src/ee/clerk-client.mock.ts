import type { User } from '@clerk/backend';
import type { UserAPI, OrganizationAPI } from '@clerk/backend/dist/api/endpoints';
import {
  CLERK_USER_1,
  CLERK_USER_2,
  CLERK_ORGANIZATION_1,
  CLERK_ORGANIZATION_2,
  CLERK_ORGANIZATION_1_MEMBERSHIP_1,
} from './clerk-mock-data';

type MakeWritable<T, K extends keyof T> = {
  -readonly [P in K]: T[P];
} & {
  [P in Exclude<keyof T, K>]: T[P];
};

export class ClerkClientMock {
  private clerkUsers = new Map([
    [CLERK_USER_1.id, CLERK_USER_1],
    [CLERK_USER_2.id, CLERK_USER_2],
  ]);
  private clerkOrganizations = new Map([
    [CLERK_ORGANIZATION_1.id, CLERK_ORGANIZATION_1],
    [CLERK_ORGANIZATION_2.id, CLERK_ORGANIZATION_2],
  ]);

  private clerkOrganizationMemberships = [CLERK_ORGANIZATION_1_MEMBERSHIP_1];

  private getUserById(userId: string) {
    const user = this.clerkUsers.get(userId);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  get users(): Partial<UserAPI> {
    const updateUser: UserAPI['updateUser'] = async (userId, params) => {
      const user = this.getUserById(userId);
      const updatedUser = { ...user, ...params } as User;
      this.clerkUsers.set(userId, updatedUser);

      return updatedUser;
    };

    const updateUserMetadata: UserAPI['updateUserMetadata'] = async (userId, params) => {
      const user = this.getUserById(userId);
      const newUser = { ...user } as MakeWritable<User, 'publicMetadata' | 'privateMetadata'>;
      newUser.publicMetadata = { ...user.publicMetadata, ...params.publicMetadata };
      newUser.privateMetadata = { ...user.privateMetadata, ...params.privateMetadata };
      this.clerkUsers.set(userId, newUser);

      return newUser;
    };

    const getUser: UserAPI['getUser'] = async (userId) => {
      return this.getUserById(userId);
    };

    const getUserList: UserAPI['getUserList'] = async (params = {}) => {
      const users = Array.from(this.clerkUsers.values()).filter((user) => {
        if (params.emailAddress && params.emailAddress.length > 0) {
          return user.emailAddresses.some((emailAddress) => emailAddress.emailAddress === params.emailAddress[0]);
        }

        return true;
      });

      return {
        data: users,
        totalCount: users.length,
      };
    };

    const getOrganizationMembershipList: UserAPI['getOrganizationMembershipList'] = async (params) => {
      const users = Array.from(this.clerkOrganizationMemberships.values()).filter(
        (membership) => membership.organization.id === params.userId
      );

      return Promise.resolve({
        data: users,
        totalCount: users.length,
      });
    };

    const deleteUser: UserAPI['deleteUser'] = async (userId) => {
      const user = this.getUserById(userId);
      this.clerkUsers.delete(userId);

      return user;
    };

    return {
      updateUser,
      updateUserMetadata,
      getUser,
      getUserList,
      deleteUser,
      getOrganizationMembershipList,
    };
  }

  get organizations() {
    const getOrganization: OrganizationAPI['getOrganization'] = async (params) => {
      if ('organizationId' in params) {
        return this.clerkOrganizations.get(params.organizationId);
      }

      if ('slug' in params) {
        return Array.from(this.clerkOrganizations.values()).find((org) => org.slug === params.slug);
      }

      throw new Error('Invalid parameters: must provide either organizationId or slug');
    };

    const getOrganizationMembershipList: OrganizationAPI['getOrganizationMembershipList'] = async (params) => {
      const memberships = Array.from(this.clerkOrganizationMemberships.values()).filter(
        (membership) => membership.organization.id === params.organizationId
      );

      return {
        data: memberships,
        totalCount: memberships.length,
      };
    };

    const createOrganizationMembership: OrganizationAPI['createOrganizationMembership'] = async (params) => {
      const newMembership = {
        ...params,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        id: Date.now().toString(),
        publicMetadata: {},
        privateMetadata: {},
        organization: CLERK_ORGANIZATION_1,
      };
      this.clerkOrganizationMemberships.push(newMembership);

      return newMembership;
    };

    const updateOrganization: OrganizationAPI['updateOrganization'] = async (organizationId, params) => {
      const organization = this.clerkOrganizations.get(organizationId);
      const updatedOrganization = { ...organization, ...params };
      this.clerkOrganizations.set(organizationId, updatedOrganization);

      return updatedOrganization;
    };

    const updateOrganizationMetadata: OrganizationAPI['updateOrganizationMetadata'] = async (
      organizationId,
      params
    ) => {
      const organization = this.clerkOrganizations.get(organizationId);
      const updatedOrganization = { ...organization, ...params };
      this.clerkOrganizations.set(organizationId, updatedOrganization);

      return updatedOrganization;
    };

    const deleteOrganization: OrganizationAPI['deleteOrganization'] = async (organizationId) => {
      const organization = this.clerkOrganizations.get(organizationId);
      this.clerkOrganizations.delete(organizationId);

      return organization;
    };

    return {
      getOrganization,
      getOrganizationMembershipList,
      createOrganizationMembership,
      updateOrganization,
      updateOrganizationMetadata,
      deleteOrganization,
    };
  }
}
