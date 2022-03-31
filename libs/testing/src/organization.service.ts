import { MemberRoleEnum, MemberStatusEnum } from '@novu/shared';
import { faker } from '@faker-js/faker';
import { MemberRepository, OrganizationRepository } from '@novu/dal';

export class OrganizationService {
  private organizationRepository = new OrganizationRepository();

  private memberRepository = new MemberRepository();

  async createOrganization() {
    const organization = await this.organizationRepository.create({
      logo: faker.image.avatar(),
      name: faker.company.companyName(),
    });

    return organization;
  }

  async addMember(organizationId: string, userId: string) {
    await this.memberRepository.addMember(organizationId, {
      _userId: userId,
      roles: [MemberRoleEnum.ADMIN],
      memberStatus: MemberStatusEnum.ACTIVE,
    });
  }
}
