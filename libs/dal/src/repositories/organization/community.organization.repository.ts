import { UnauthorizedException } from '@nestjs/common';
import { BaseRepository } from '../base-repository';
import { CommunityMemberRepository } from '../member';
import { IPartnerConfiguration, OrganizationDBModel, OrganizationEntity } from './organization.entity';
import { Organization } from './organization.schema';
import { IOrganizationRepository } from './organization-repository.interface';

export class CommunityOrganizationRepository
  extends BaseRepository<OrganizationDBModel, OrganizationEntity, object>
  implements IOrganizationRepository
{
  private memberRepository = new CommunityMemberRepository();

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

  async getUsersMembersOrganizationIds(userId: string): Promise<string[]> {
    const members = await this.memberRepository.findUserActiveMembers(userId);

    return members.map((member) => member._organizationId);
  }

  async getUserAuthorizedOrganizationIds(userId: string): Promise<string[]> {
    return this.getUsersMembersOrganizationIds(userId);
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

  async updateDefaultLocale(
    organizationId: string,
    defaultLocale: string
  ): Promise<{ matched: number; modified: number }> {
    return this.update(
      {
        _id: organizationId,
      },
      {
        $set: {
          defaultLocale,
        },
      }
    );
  }

  async findByPartnerConfigurationId({ userId, configurationId }: { userId: string; configurationId: string }) {
    const organizationIds = await this.getUsersMembersOrganizationIds(userId);

    return await this.find(
      {
        _id: { $in: organizationIds },
        'partnerConfigurations.configurationId': configurationId,
      },
      { 'partnerConfigurations.$': 1 }
    );
  }

  async upsertPartnerConfiguration({
    userId,
    organizationId,
    configuration,
  }: {
    userId: string;
    organizationId: string;
    configuration: IPartnerConfiguration;
  }) {
    const allowedOrganizationIds = await this.getUsersMembersOrganizationIds(userId);
    this.assertOrganizationsAuthorized([organizationId], allowedOrganizationIds);

    return this.performUpsertPartnerConfiguration({ organizationId, configuration });
  }

  async bulkUpdatePartnerConfiguration({
    userId,
    data,
    configuration,
  }: {
    userId: string;
    data: Record<string, string[]>;
    configuration: IPartnerConfiguration;
  }) {
    const { teamId } = configuration;
    const allowedOrganizationIds = await this.getUsersMembersOrganizationIds(userId);
    const requestedOrgIds = Object.keys(data);
    this.assertOrganizationsAuthorized(requestedOrgIds, allowedOrganizationIds);

    // remove all existing configurations for this team across the user's organizations
    await this.update(
      {
        _id: { $in: allowedOrganizationIds },
      },
      {
        $pull: {
          partnerConfigurations: {
            teamId,
          },
        },
      }
    );

    const promises = requestedOrgIds.map((orgId) =>
      this.performUpsertPartnerConfiguration({
        organizationId: orgId,
        configuration: {
          ...configuration,
          projectIds: data[orgId],
        },
      })
    );

    await Promise.all(promises);
  }

  private assertOrganizationsAuthorized(requestedOrgIds: string[], allowedOrganizationIds: string[]) {
    const allowedSet = new Set(allowedOrganizationIds);
    const unauthorized = requestedOrgIds.filter((id) => !allowedSet.has(id));
    if (unauthorized.length > 0) {
      throw new UnauthorizedException('Not allowed to write partner configuration for the requested organization(s)');
    }
  }

  private async performUpsertPartnerConfiguration({
    organizationId,
    configuration,
  }: {
    organizationId: string;
    configuration: IPartnerConfiguration;
  }) {
    // try to update existing configuration
    const updateResult = await this.update(
      {
        _id: organizationId,
        'partnerConfigurations.teamId': configuration.teamId,
      },
      {
        $set: {
          'partnerConfigurations.$': configuration,
        },
      }
    );

    // if no configurations were matched, then add new configuration
    if (updateResult.modified === 0) {
      return this.update(
        {
          _id: organizationId,
        },
        {
          $push: {
            partnerConfigurations: configuration,
          },
        }
      );
    }

    return updateResult;
  }
}
