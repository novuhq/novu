import { randomBytes } from 'node:crypto';
import { ConflictException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { encryptSecret } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  CommunityOrganizationRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  EmailProviderIdEnum,
  FeatureNameEnum,
  getFeatureForTierAsBoolean,
  providers,
  slugify,
} from '@novu/shared';
import { ClientSession } from 'mongoose';
import shortid from 'shortid';

import type { AgentIntegrationResponseDto } from '../../dtos';
import { toAgentIntegrationResponse } from '../../mappers/agent-response.mapper';

export type FindOrCreateNovuEmailResult = {
  response: AgentIntegrationResponseDto;
  provisionedNewLink: boolean;
};

@Injectable()
export class FindOrCreateNovuEmail {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly organizationRepository: CommunityOrganizationRepository
  ) {}

  /**
   * Find the agent's existing NovuAgent integration link, or create a new
   * Integration + link atomically. Idempotent — safe to call concurrently.
   */
  async execute(agentId: string, environmentId: string, organizationId: string): Promise<FindOrCreateNovuEmailResult> {
    await this.enforceEmailTier(organizationId);

    const existing = await this.findExistingLink(agentId, environmentId, organizationId);
    if (existing) return { response: existing, provisionedNewLink: false };

    return this.agentIntegrationRepository.withTransaction(async (session) => {
      const recheck = await this.findExistingLink(agentId, environmentId, organizationId);
      if (recheck) return { response: recheck, provisionedNewLink: false };

      const displayName = providers.find((p) => p.id === EmailProviderIdEnum.NovuAgent)?.displayName ?? 'Novu Email';
      const identifier = `${slugify(displayName)}-${shortid.generate()}`;

      const integration = await this.integrationRepository.create(
        {
          providerId: EmailProviderIdEnum.NovuAgent,
          channel: ChannelTypeEnum.EMAIL,
          credentials: { secretKey: encryptSecret(randomBytes(32).toString('hex')) },
          configurations: {},
          name: displayName,
          identifier,
          active: true,
          _environmentId: environmentId,
          _organizationId: organizationId,
        } as any,
        { session }
      );

      const response = await this.createLink(agentId, integration, environmentId, organizationId, session);

      return { response, provisionedNewLink: true };
    });
  }

  async findExistingLink(
    agentId: string,
    environmentId: string,
    organizationId: string
  ): Promise<AgentIntegrationResponseDto | null> {
    const links = await this.agentIntegrationRepository.find(
      { _agentId: agentId, _environmentId: environmentId, _organizationId: organizationId },
      '*'
    );

    if (links.length === 0) return null;

    const linkedIntegrationIds = links.map((l) => l._integrationId);
    const emailIntegration = await this.integrationRepository.findOne(
      {
        _id: { $in: linkedIntegrationIds } as unknown as string,
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id identifier name providerId channel active'
    );

    if (!emailIntegration) return null;

    const link = links.find((l) => l._integrationId === emailIntegration._id);
    if (!link) return null;

    return toAgentIntegrationResponse(link, emailIntegration);
  }

  private async createLink(
    agentId: string,
    integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'>,
    environmentId: string,
    organizationId: string,
    session: ClientSession | null
  ): Promise<AgentIntegrationResponseDto> {
    const existingLink = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agentId,
        _integrationId: integration._id,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['_id'],
      { session }
    );

    if (existingLink) {
      throw new ConflictException('This integration is already linked to the agent.');
    }

    const link = await this.agentIntegrationRepository.create(
      {
        _agentId: agentId,
        _integrationId: integration._id,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      { session }
    );

    return toAgentIntegrationResponse(link, integration);
  }

  private async enforceEmailTier(organizationId: string): Promise<void> {
    const organization = await this.organizationRepository.findById(organizationId);
    const tier = organization?.apiServiceLevel ?? ApiServiceLevelEnum.FREE;
    const allowed = getFeatureForTierAsBoolean(FeatureNameEnum.AGENT_EMAIL_INTEGRATION, tier);

    if (!allowed) {
      throw new HttpException('Payment Required', HttpStatus.PAYMENT_REQUIRED);
    }
  }
}
