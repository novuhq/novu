import { Injectable, NotFoundException } from '@nestjs/common';
import { GetDecryptedSecretKey, GetDecryptedSecretKeyCommand } from '@novu/application-generic';
import { CommunityOrganizationRepository, EnvironmentRepository } from '@novu/dal';
import type { HumanAccountSecretKeyResponseDto } from '../../dtos/human-account.dto';
import { HumanBackingAccounts } from '../../services/human-backing-accounts.service';
import { findBackingDevelopmentEnvironment } from '../ensure-backing-organization/ensure-backing-organization.usecase';
import { GetBackingSecretKeyCommand } from './get-backing-secret-key.command';

/**
 * The Development environment's secret key of a Human account's backing organization, for the Human
 * website's server to call the Novu API with. Only looks things up; it never creates the organization.
 */
@Injectable()
export class GetBackingSecretKey {
  constructor(
    private readonly humanBackingAccounts: HumanBackingAccounts,
    private readonly communityOrganizationRepository: CommunityOrganizationRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly getDecryptedSecretKey: GetDecryptedSecretKey
  ) {}

  async execute(command: GetBackingSecretKeyCommand): Promise<HumanAccountSecretKeyResponseDto> {
    const account = await this.humanBackingAccounts.find(command.humanUserId);
    const organization = account?.clerkOrganizationId
      ? await this.communityOrganizationRepository.findOne({ externalId: account.clerkOrganizationId }, '_id')
      : null;

    if (!organization) {
      throw new NotFoundException('This Human account has no backing organization yet.');
    }

    const environments = await this.environmentRepository.findOrganizationEnvironments(organization._id);
    const environment = findBackingDevelopmentEnvironment(environments);
    const secretKey = await this.getDecryptedSecretKey.execute(
      GetDecryptedSecretKeyCommand.create({ environmentId: environment._id, organizationId: organization._id })
    );

    return { environmentId: environment._id, secretKey };
  }
}
