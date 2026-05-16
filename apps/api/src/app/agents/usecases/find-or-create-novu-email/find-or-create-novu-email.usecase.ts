import { randomBytes } from 'node:crypto';
import { ConflictException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { encryptSecret, isValidAgentEmailSlugPrefix } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
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

function sanitizeSlug(input: string): string {
  return slugify(input).slice(0, 32).replace(/^-+/, '').replace(/-+$/, '');
}

@Injectable()
export class FindOrCreateNovuEmail {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly organizationRepository: CommunityOrganizationRepository,
    private readonly agentRepository: AgentRepository
  ) {}

  /**
   * Find the agent's existing NovuAgent integration link, or create a new
   * Integration + link atomically. Idempotent — safe to call concurrently.
   */
  async execute(agentId: string, environmentId: string, organizationId: string): Promise<FindOrCreateNovuEmailResult> {
    await this.enforceEmailTier(organizationId);

    const existing = await this.findExistingLink(agentId, environmentId, organizationId);
    if (existing) return { response: existing, provisionedNewLink: false };

    const emailSlugPrefix = await this.deriveEmailSlugPrefix(agentId, environmentId, organizationId);

    return this.agentIntegrationRepository.withTransaction(async (session) => {
      const recheck = await this.findExistingLink(agentId, environmentId, organizationId);
      if (recheck) return { response: recheck, provisionedNewLink: false };

      const displayName = providers.find((p) => p.id === EmailProviderIdEnum.NovuAgent)?.displayName ?? 'Novu Email';
      const identifier = `${slugify(displayName)}-${shortid.generate()}`;

      const integration = await this.integrationRepository.create(
        {
          providerId: EmailProviderIdEnum.NovuAgent,
          channel: ChannelTypeEnum.EMAIL,
          credentials: {
            secretKey: encryptSecret(randomBytes(32).toString('hex')),
            emailSlugPrefix,
          },
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

  /**
   * Build the per-agent slug prefix from the agent's identifier. Falls back
   * to a random short id if the identifier slugifies to something the slug
   * regex would reject (empty, longer than 32 chars after sanitization, etc.).
   */
  private async deriveEmailSlugPrefix(agentId: string, environmentId: string, organizationId: string): Promise<string> {
    const agent = await this.agentRepository.findOne(
      { _id: agentId, _environmentId: environmentId, _organizationId: organizationId },
      ['identifier', 'name']
    );

    const candidate = sanitizeSlug(agent?.identifier ?? agent?.name ?? '');
    if (candidate && isValidAgentEmailSlugPrefix(candidate)) {
      return candidate;
    }

    // Fallback: shortid + sanitize. shortid uses URL-safe chars that include
    // `_` and `~` which our slug regex rejects, so we sanitize the result and
    // retry a small number of times before falling back to a deterministic
    // last-resort slug derived from the agent id (always passes the regex).
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const fallback = sanitizeSlug(`agent-${shortid.generate().toLowerCase()}`);
      if (fallback && isValidAgentEmailSlugPrefix(fallback)) {
        return fallback;
      }
    }

    return `agent-${agentId.slice(-8)}`;
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
    // Include `credentials` so the mapper can derive the shared-inbox address
    // from `emailSlugPrefix`. The field is plaintext (no decryption needed).
    const emailIntegration = await this.integrationRepository.findOne(
      {
        _id: { $in: linkedIntegrationIds } as unknown as string,
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id identifier name providerId channel active credentials'
    );

    if (!emailIntegration) return null;

    const link = links.find((l) => l._integrationId === emailIntegration._id);
    if (!link) return null;

    return toAgentIntegrationResponse(link, emailIntegration, { _id: agentId });
  }

  private async createLink(
    agentId: string,
    integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'name' | 'providerId' | 'channel' | 'active'> &
      Partial<Pick<IntegrationEntity, 'credentials'>>,
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
        connectedAt: new Date(),
      },
      { session }
    );

    return toAgentIntegrationResponse(link, integration, { _id: agentId });
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
