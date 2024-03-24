import { IPartnerConfiguration, OrganizationDBModel, OrganizationEntity } from './organization.entity';
import { BaseRepository } from '../base-repository';
import { Organization } from './organization.schema';
import { MemberRepository } from '../member';
import { ApiServiceLevelEnum } from '@novu/shared';

export class OrganizationRepository extends BaseRepository<OrganizationDBModel, OrganizationEntity, object> {
  private memberRepository = new MemberRepository();

  constructor() {
    super(Organization, OrganizationEntity);
  }

  async findById(id: string, select?: string): Promise<OrganizationEntity | null> {
    const data = await this.MongooseModel.findById(id, select).read('secondaryPreferred');
    if (!data) return null;

    return this.mapEntity(data.toObject());
  }

  async findUserActiveOrganizations(userId: string): Promise<OrganizationEntity[]> {
    const organizationIds = await this.getUsersMembersOrganizationIds(userId);

    return await this.find({
      _id: { $in: organizationIds },
    });
  }

  private async getUsersMembersOrganizationIds(userId: string): Promise<string[]> {
    const members = await this.memberRepository.findUserActiveMembers(userId);

    return members.map((member) => member._organizationId);
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

  async renameOrganization(organizationId: string, payload: { name: string }) {
    return this.update(
      {
        _id: organizationId,
      },
      {
        $set: {
          name: payload.name,
        },
      }
    );
  }

  async updateServiceLevel(organizationId: string, apiServiceLevel: ApiServiceLevelEnum) {
    return this.update(
      {
        _id: organizationId,
      },
      {
        $set: {
          apiServiceLevel,
        },
      }
    );
  }

  async findPartnerConfigurationDetails(organizationId: string, userId: string, configurationId: string) {
    const organizationIds = await this.getUsersMembersOrganizationIds(userId);

    return await this.find(
      {
        _id: { $in: organizationIds },
        'partnerConfigurations.configurationId': configurationId,
      },
      { 'partnerConfigurations.$': 1 }
    );
  }

  async updatePartnerConfiguration(organizationId: string, userId: string, configuration: IPartnerConfiguration) {
    const organizationIds = await this.getUsersMembersOrganizationIds(userId);

    return this.update(
      {
        _id: { $in: organizationIds },
      },
      {
        $push: {
          partnerConfigurations: configuration,
        },
      }
    );
  }

  async bulkUpdatePartnerConfiguration(userId: string, data: Record<string, string[]>, configurationId: string) {
    const organizationIds = await this.getUsersMembersOrganizationIds(userId);
    const usedOrgIds = Object.keys(data);
    const unusedOrgIds = organizationIds.filter((org) => !usedOrgIds.includes(org));
    const bulkWriteOps = organizationIds.map((orgId) => {
      return {
        updateOne: {
          filter: { _id: orgId, 'partnerConfigurations.configurationId': configurationId },
          update: {
            'partnerConfigurations.$.projectIds': unusedOrgIds.includes(orgId) ? [] : data[orgId],
          },
        },
      };
    });

    return await this.bulkWrite(bulkWriteOps);
  }
}
