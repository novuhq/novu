import { CommunityOrganizationRepository, OrganizationRepository } from '@novu/dal';
import { ApiServiceLevelEnum } from '@novu/shared';
import { getEERepository } from './ee.repository.factory';

export class EEOrganizationService {
  private organizationRepository = getEERepository<OrganizationRepository>('OrganizationRepository');
  private communityOrganizationRepository = new CommunityOrganizationRepository();

  async createOrganization(orgId: string) {
    //  if internal organization exists delete so we can re-create with same Clerk org id
    const org = await this.communityOrganizationRepository.findOne({ externalId: orgId });

    if (org) {
      await this.communityOrganizationRepository.delete({ _id: org._id });
    }

    const syncExternalOrg = {
      externalId: orgId,
    };

    /**
     * Links Clerk organization with internal organization collection
     * (!) this is without org creation side-effects
     */
    return this.organizationRepository.create(syncExternalOrg);
  }

  async getOrganization(organizationId: string) {
    return await this.organizationRepository.findById(organizationId);
  }

  async updateServiceLevel(organizationId: string, serviceLevel: ApiServiceLevelEnum) {
    await this.communityOrganizationRepository.update({ _id: organizationId }, { apiServiceLevel: serviceLevel });
  }
}
