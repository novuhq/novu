import { BaseRepository } from '../base-repository';
import { MemberRepository } from '../member';
import { OrganizationEntity } from './organization.entity';
import { Organization } from './organization.schema';

export class OrganizationRepository extends BaseRepository<OrganizationEntity> {
  private memberRepository = new MemberRepository();

  constructor() {
    super(Organization, OrganizationEntity);
  }

  async findUserActiveOrganizations(userId: string): Promise<OrganizationEntity[]> {
    const members = await this.memberRepository.findUserActiveMembers(userId);

    return await this.find({
      _id: members.map((member) => member._organizationId),
    });
  }

  async updateBrandingDetails(organizationId: string, branding: { color: string; logo: string }) {
    return this.update(
      {
        _id: organizationId,
      },
      {
        $set: {
          branding,
        },
      }
    );
  }
}
