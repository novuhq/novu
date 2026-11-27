import { BadRequestException, Injectable } from '@nestjs/common';
import { FeatureFlagsService } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { ApiKeyRevocationService } from '../../auth/api-key-revocation/api-key-revocation.service';
import { isSubscriberTokensEnabled } from '../shared/assert-subscriber-tokens-enabled';
import { isWebChatAgentHashValidForAnyKey } from './web-chat-agent-hash';

const WEB_CHAT_UNAVAILABLE_MESSAGE = 'This agent is not available on web chat';

export type PublishedWebChatAgent = {
  agentId: string;
  agentIdentifier: string;
  integrationId: string;
  integrationIdentifier: string;
};

export type WebChatAgentAccess = {
  agentHash?: string;
  /** The session came from a subscriber token, so Novu already knows who the subscriber is. */
  isTokenSession: boolean;
};

@Injectable()
export class WebChatPublicationService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly apiKeyRevocationService: ApiKeyRevocationService,
    private readonly featureFlagsService: FeatureFlagsService
  ) {}

  /**
   * Resolve the Web Chat publication for a specific agent.
   * Must not pick an arbitrary env-wide `novu-web-chat` integration — orgs
   * can have one per agent; only the link for *this* agent counts.
   *
   * With Web Chat HMAC on, a hash session must prove it may name this agent with `agentHash`.
   * A subscriber token session skips that check while subscriber tokens are enabled.
   */
  async resolvePublishedAgent(
    agentIdentifier: string,
    environmentId: string,
    organizationId: string,
    { agentHash, isTokenSession }: WebChatAgentAccess
  ): Promise<PublishedWebChatAgent> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: agentIdentifier,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['_id', 'identifier', 'active']
    );

    if (!agent || agent.active === false) {
      throw new BadRequestException(WEB_CHAT_UNAVAILABLE_MESSAGE);
    }

    const links = await this.agentIntegrationRepository.find(
      {
        _agentId: agent._id,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['_integrationId']
    );

    if (links.length === 0) {
      throw new BadRequestException(WEB_CHAT_UNAVAILABLE_MESSAGE);
    }

    const linkedIntegrationIds = links.map((link) => link._integrationId);
    const integration = await this.integrationRepository.findOne(
      {
        _id: { $in: linkedIntegrationIds },
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: ChatProviderIdEnum.NovuWebChat,
      },
      '_id identifier credentials'
    );

    if (!integration) {
      throw new BadRequestException(WEB_CHAT_UNAVAILABLE_MESSAGE);
    }

    if (integration.credentials?.hmac && !(await this.skipsAgentHash(isTokenSession, environmentId, organizationId))) {
      const environment = await this.environmentRepository.findOne(
        { _id: environmentId, _organizationId: organizationId },
        'apiKeys'
      );

      if (!environment?.apiKeys?.length) {
        throw new BadRequestException('Please provide a valid HMAC hash');
      }

      const apiKeys = await this.apiKeyRevocationService.getSigningKeys({
        organizationId,
        environmentId,
        apiKeys: environment.apiKeys,
      });

      if (!isWebChatAgentHashValidForAnyKey(apiKeys, agentIdentifier, agentHash)) {
        throw new BadRequestException('Please provide a valid HMAC hash');
      }
    }

    return {
      agentId: agent._id,
      agentIdentifier: agent.identifier,
      integrationId: integration._id,
      integrationIdentifier: integration.identifier,
    };
  }

  private async skipsAgentHash(isTokenSession: boolean, environmentId: string, organizationId: string) {
    return (
      isTokenSession &&
      isSubscriberTokensEnabled({ featureFlagsService: this.featureFlagsService, environmentId, organizationId })
    );
  }
}
