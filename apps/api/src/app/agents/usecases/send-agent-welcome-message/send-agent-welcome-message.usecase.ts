import { Injectable } from '@nestjs/common';
import { AnalyticsService, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentRepository, ChannelEndpointRepository, IntegrationRepository } from '@novu/dal';

import { ChatSdkService } from '../../services/chat-sdk.service';
import { PLATFORM_ENDPOINT_CONFIG } from '../../utils/platform-endpoint-config';
import { resolveAgentPlatform } from '../../utils/provider-to-platform';
import { SendAgentWelcomeMessageCommand } from './send-agent-welcome-message.command';

const WELCOME_MESSAGE = `Hey! I'm connected and ready. Try sending me a message to see your agent in action.`;

@Injectable()
export class SendAgentWelcomeMessage {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly chatSdkService: ChatSdkService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: SendAgentWelcomeMessageCommand): Promise<{ sent: boolean }> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      return { sent: false };
    }

    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.integrationIdentifier,
    });

    if (!integration) {
      return { sent: false };
    }

    const platform = resolveAgentPlatform(integration.providerId);
    if (!platform) {
      return { sent: false };
    }

    const endpointConfig = PLATFORM_ENDPOINT_CONFIG[platform];
    if (!endpointConfig) {
      return { sent: false };
    }

    const endpoint = await this.channelEndpointRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      integrationIdentifier: command.integrationIdentifier,
      type: endpointConfig.endpointType,
    });

    if (!endpoint) {
      return { sent: false };
    }

    const platformUserId = (endpoint.endpoint as Record<string, string>)[endpointConfig.identityField];
    if (!platformUserId) {
      return { sent: false };
    }

    try {
      await this.chatSdkService.sendDirectMessage(agent._id, command.integrationIdentifier, platformUserId, {
        markdown: WELCOME_MESSAGE,
      });

      this.analyticsService.track(`Agent Welcome Message Sent - [Agents]`, command.userId, {
        _organization: command.organizationId,
        environmentId: command.environmentId,
        agentIdentifier: command.agentIdentifier,
        integrationIdentifier: command.integrationIdentifier,
        platform,
      });

      return { sent: true };
    } catch (err) {
      this.logger.warn(err, `Failed to send welcome message for agent "${command.agentIdentifier}"`);

      return { sent: false };
    }
  }
}
