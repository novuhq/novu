import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { validateHmacEncryption } from '../../inbox/utils/encryption';

const WEB_CHAT_UNAVAILABLE_MESSAGE = 'This agent is not available on web chat';

export type PublishedWebChatAgent = {
  agentId: string;
  agentIdentifier: string;
  integrationId: string;
  integrationIdentifier: string;
};

/**
 * Publication gate + optional Inbox-shaped `agentHash` HMAC (NV-8442).
 * Long-term HMAC home is adapter `verifySession` once that hook sees the body.
 */
@Injectable()
export class WebChatPublicationService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly environmentRepository: EnvironmentRepository
  ) {}

  async resolvePublishedAgent(
    agentIdentifier: string,
    environmentId: string,
    organizationId: string,
    agentHash?: string
  ): Promise<PublishedWebChatAgent> {
    const integration = await this.integrationRepository.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: ChatProviderIdEnum.NovuWebChat,
      },
      '_id identifier credentials'
    );

    if (!integration) {
      throw new BadRequestException(WEB_CHAT_UNAVAILABLE_MESSAGE);
    }

    if (integration.credentials?.hmac) {
      const environment = await this.environmentRepository.findOne(
        { _id: environmentId, _organizationId: organizationId },
        'apiKeys'
      );

      if (!environment?.apiKeys?.length) {
        throw new BadRequestException('Please provide a valid HMAC hash');
      }

      validateHmacEncryption({
        apiKeys: environment.apiKeys.map((apiKey) => apiKey.key),
        subscriberId: agentIdentifier,
        subscriberHash: agentHash,
      });
    }

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

    const link = await this.agentIntegrationRepository.findOne(
      {
        _agentId: agent._id,
        _integrationId: integration._id,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['_id']
    );

    if (!link) {
      throw new BadRequestException(WEB_CHAT_UNAVAILABLE_MESSAGE);
    }

    return {
      agentId: agent._id,
      agentIdentifier: agent.identifier,
      integrationId: integration._id,
      integrationIdentifier: integration.identifier,
    };
  }
}
