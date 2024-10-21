import type { IOrganizationEntity, IServicesHashes, IUserEntity, JobTitleEnum, ProductUseCases } from '@novu/shared';
import { OrganizationResource, UserResource } from '@clerk/types';

export const toUserEntity = (clerkUser: UserResource): IUserEntity => {
  /*
   * When mapping to IUserEntity, we have 2 cases:
   *  - user exists and has signed in
   *  - user is signing up
   *
   * In the case where the user is still signing up, we are using the clerk identifier for the id.
   * This however quickly gets update to the externalId (which is actually the novu internal
   * entity identifier) that gets used further in the app. There are a few consumers that
   * want to use this identifier before it is set to the internal value. These consumers
   * should make sure they only report with the correct value, a reference
   * implementation can be found in 'apps/web/src/hooks/useMonitoring.ts'
   */

  return {
    _id: clerkUser.externalId ?? clerkUser.id,
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
   *
   * In the case where the user is still signing up, we are using the clerk identifier for the id.
   * This however quickly gets update to the externalId (which is actually the novu internal
   * entity identifier) that gets used further in the app. There are a few consumers that
   * want to use this identifier before it is set to the internal value. These consumers
   * should make sure they only report with the correct value, a reference
   * implementation can be found in 'apps/web/src/hooks/useMonitoring.ts'
   */

  return {
    _id: (clerkOrganization.publicMetadata.externalOrgId as string) ?? clerkOrganization.id,
    name: clerkOrganization.name,
    createdAt: clerkOrganization.createdAt.toISOString(),
    updatedAt: clerkOrganization.updatedAt.toISOString(),
    domain: clerkOrganization.publicMetadata.domain as string,
    productUseCases: clerkOrganization.publicMetadata.productUseCases as ProductUseCases,
    language: clerkOrganization.publicMetadata.language as string[],
  };
};
