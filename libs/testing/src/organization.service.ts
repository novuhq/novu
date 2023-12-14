import { ApiServiceLevelEnum, MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { faker } from '@faker-js/faker';
import { MemberRepository, OrganizationRepository } from '@novu/dal';

export class OrganizationService {
  private organizationRepository = new OrganizationRepository();

  private memberRepository = new MemberRepository();

  async createOrganization(options?: Parameters<OrganizationRepository['create']>[0]) {
    if (options) {
      return await this.organizationRepository.create({
        logo: faker.image.avatar(),
        name: faker.company.companyName(),
        ...options,
      });
    }

    return await this.organizationRepository.create({
      logo: faker.image.avatar(),
      name: faker.company.companyName(),
    });
  }

  async addMember(organizationId: string, userId: string) {
    await this.memberRepository.addMember(organizationId, {
      _userId: userId,
      roles: [MemberRoleEnum.ADMIN],
      memberStatus: MemberStatusEnum.ACTIVE,
    });
  }

  async getOrganization(organizationId: string) {
    return await this.organizationRepository.findOne({
      _id: organizationId,
    });
  }

  async updateServiceLevel(organizationId: string, serviceLevel: ApiServiceLevelEnum) {
    await this.organizationRepository.updateServiceLevel(organizationId, serviceLevel);
  }
}
