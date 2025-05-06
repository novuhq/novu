import type { IOrganizationEntity, IServicesHashes, IUserEntity, JobTitleEnum, ProductUseCases } from '@novu/shared';
import { OrganizationResource, UserResource } from '@clerk/types';

export const toUserEntity = (clerkUser: UserResource): IUserEntity => {
  /*
   * When mapping to IUserEntity, we have 2 cases:
   *  - user exists and has signed in
   *  - user is signing up
   *
   * In cases where the externalId is not received yet from clerk, the "_id" field will be null.
   */

  return {
    _id: clerkUser.externalId as string,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    email: clerkUser.emailAddresses[0].emailAddress,
    profilePicture: clerkUser.imageUrl,
    createdAt: clerkUser.createdAt?.toISOString() ?? '',
    showOnBoarding: !!clerkUser.publicMetadata.showOnBoarding,
    showOnBoardingTour: clerkUser.publicMetadata.showOnBoardingTour as number,
    servicesHashes: clerkUser.publicMetadata.servicesHashes as IServicesHashes,
    jobTitle: clerkUser.publicMetadata.jobTitle as JobTitleEnum,
    hasPassword: clerkUser.passwordEnabled,
  };
};

export const toOrganizationEntity = (clerkOrganization: OrganizationResource): IOrganizationEntity => {
  /*
   * When mapping to IOrganizationEntity, we have 2 cases:
   *  - user exists and has signed in
   *  - user is signing up
   *
   * In cases where the externalOrgId is not received yet from clerk, the "_id" field will be null.
   */

  return {
    _id: clerkOrganization.publicMetadata.externalOrgId as string,
    name: clerkOrganization.name,
    createdAt: clerkOrganization.createdAt.toISOString(),
    updatedAt: clerkOrganization.updatedAt.toISOString(),
    domain: clerkOrganization.publicMetadata.domain as string,
    productUseCases: clerkOrganization.publicMetadata.productUseCases as ProductUseCases,
    language: clerkOrganization.publicMetadata.language as string[],
  };
};
