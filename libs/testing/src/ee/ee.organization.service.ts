import { ApiServiceLevelEnum, MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { CommunityOrganizationRepository, MemberRepository, OrganizationRepository } from '@novu/dal';
import { getEERepository } from './ee.repository.factory';

export class EEOrganizationService {
  private organizationRepository = getEERepository<OrganizationRepository>('OrganizationRepository');
  private communityOrganizationRepository = new CommunityOrganizationRepository();
  private memberRepository = getEERepository<MemberRepository>('MemberRepository');

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

  async addMember(organizationId: string, userId: string) {
    await this.memberRepository.addMember(organizationId, {
      _userId: userId,
      roles: [MemberRoleEnum.ADMIN],
      memberStatus: MemberStatusEnum.ACTIVE,
    });
  }

  async getOrganization(organizationId: string) {
    return await this.organizationRepository.findById(organizationId);
  }

  async updateServiceLevel(organizationId: string, serviceLevel: ApiServiceLevelEnum) {
    await this.communityOrganizationRepository.update({ _id: organizationId }, { apiServiceLevel: serviceLevel });
  }
}
