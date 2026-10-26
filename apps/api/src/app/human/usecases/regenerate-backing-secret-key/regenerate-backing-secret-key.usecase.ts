import { Injectable, NotFoundException } from '@nestjs/common';
import { CommunityOrganizationRepository, EnvironmentRepository } from '@novu/dal';
import { GetApiKeysCommand } from '../../../environments-v1/usecases/get-api-keys/get-api-keys.command';
import { RegenerateApiKeys } from '../../../environments-v1/usecases/regenerate-api-keys/regenerate-api-keys.usecase';
import type { HumanAccountSecretKeyResponseDto } from '../../dtos/human-account.dto';
import { HumanBackingAccounts } from '../../services/human-backing-accounts.service';
import { findBackingDevelopmentEnvironment } from '../ensure-backing-organization/ensure-backing-organization.usecase';
import { RegenerateBackingSecretKeyCommand } from './regenerate-backing-secret-key.command';

/**
 * Replaces the Development environment's secret key of a Human account's backing organization, the way
 * regenerating a key works for any Novu environment: the old key stops working at once. That includes the
 * copy `human login` saved on the operator's computer, so they log in there again.
 */
@Injectable()
export class RegenerateBackingSecretKey {
  constructor(
    private readonly humanBackingAccounts: HumanBackingAccounts,
    private readonly communityOrganizationRepository: CommunityOrganizationRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly regenerateApiKeys: RegenerateApiKeys
  ) {}

  async execute(command: RegenerateBackingSecretKeyCommand): Promise<HumanAccountSecretKeyResponseDto> {
    const account = await this.humanBackingAccounts.find(command.humanUserId);
    const organization = account?.clerkOrganizationId
      ? await this.communityOrganizationRepository.findOne({ externalId: account.clerkOrganizationId }, '_id')
      : null;

    if (!organization) {
      throw new NotFoundException('This Human account has no backing organization yet.');
    }

    const environments = await this.environmentRepository.findOrganizationEnvironments(organization._id);
    const environment = findBackingDevelopmentEnvironment(environments);
    // The new key stays with the hidden Novu user the old one belonged to.
    const userId = environment.apiKeys?.[0]?._userId;
    if (!userId) {
      throw new NotFoundException('The Development environment of this Human account has no secret key.');
    }

    const [apiKey] = await this.regenerateApiKeys.execute(
      GetApiKeysCommand.create({
        environmentId: environment._id,
        organizationId: organization._id,
        userId: String(userId),
      })
    );

    return { environmentId: environment._id, secretKey: apiKey.key };
  }
}
