import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

const WEB_CHAT_UNAVAILABLE_MESSAGE = 'This agent is not available on web chat';

export type PublishedWebChatAgent = {
  agentId: string;
  agentIdentifier: string;
  integrationId: string;
  integrationIdentifier: string;
};

@Injectable()
export class WebChatPublicationService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async resolvePublishedAgent(
    agentIdentifier: string,
    environmentId: string,
    organizationId: string
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

    const integration = await this.integrationRepository.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: ChatProviderIdEnum.NovuWebChat,
      },
      '_id identifier'
    );

    if (!integration) {
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
