import { Injectable } from '@nestjs/common';
import { AnalyticsService, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import {
  AgentRepository,
  ChannelEndpointRepository,
  ConversationParticipantTypeEnum,
  IntegrationRepository,
} from '@novu/dal';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { PLATFORM_ENDPOINT_CONFIG } from '../../../shared/util/platform-endpoint-config';
import { resolveAgentPlatform } from '../../../shared/util/provider-to-platform';
import { AgentConversationService } from '../../conversation/agent-conversation.service';
import { OutboundGateway } from '../../egress/outbound.gateway';
import { SendAgentWelcomeMessageCommand } from './send-agent-welcome-message.command';

function getWelcomeText(platform: AgentPlatformEnum): string {
  switch (platform) {
    case AgentPlatformEnum.SLACK:
      return 'Your Slack app is connected! Send me a message to try it out.';
    case AgentPlatformEnum.TEAMS:
      return 'Your Teams app is connected! Send me a message to try it out.';
    case AgentPlatformEnum.WHATSAPP:
      return 'Connected! Send me a message to try it out.';
    case AgentPlatformEnum.EMAIL:
      return 'Connected! Reply to this email to try it out.';
    default:
      return 'Connected! Send me a message to try it out.';
  }
}

@Injectable()
export class SendAgentWelcomeMessage {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly conversationService: AgentConversationService,
    private readonly analyticsService: AnalyticsService,
    private readonly outboundGateway: OutboundGateway,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: SendAgentWelcomeMessageCommand): Promise<{ sent: boolean; conversationId?: string }> {
    if (command.conversationId) {
      return this.sendBridgeConnectedMessage(command as SendAgentWelcomeMessageCommand & { conversationId: string });
    }

    return this.sendWelcomeMessage(command);
  }

  private async sendWelcomeMessage(
    command: SendAgentWelcomeMessageCommand
  ): Promise<{ sent: boolean; conversationId?: string }> {
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
      const welcomeText = getWelcomeText(platform);
      const sent = await this.outboundGateway.sendDirectMessage(
        agent._id,
        command.integrationIdentifier,
        platformUserId,
        { markdown: welcomeText }
      );

      const { platformThreadId } = sent;

      const conversation = await this.conversationService.createOrGetConversation({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentId: agent._id,
        platform,
        integrationId: integration._id,
        platformThreadId,
        participantId: `${platform}:${platformUserId}`,
        participantType: ConversationParticipantTypeEnum.PLATFORM_USER,
        platformUserId,
        firstMessageText: welcomeText,
      });

      const channel = this.conversationService.getPrimaryChannel(conversation);

      await this.conversationService.persistAgentMessage({
        conversationId: conversation._id,
        channel,
        platformMessageId: sent.messageId,
        agentIdentifier: command.agentIdentifier,
        content: welcomeText,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      });

      this.analyticsService.track(`Agent Welcome Message Sent - [Agents]`, command.userId, {
        _organization: command.organizationId,
        environmentId: command.environmentId,
        agentIdentifier: command.agentIdentifier,
        integrationIdentifier: command.integrationIdentifier,
        platform,
      });

      return { sent: true, conversationId: conversation._id };
    } catch (err) {
      this.logger.warn(err, `Failed to send welcome message for agent "${command.agentIdentifier}"`);

      return { sent: false };
    }
  }

  private async sendBridgeConnectedMessage(
    command: SendAgentWelcomeMessageCommand & { conversationId: string }
  ): Promise<{ sent: boolean; conversationId?: string }> {
    const conversation = await this.conversationService.getConversation(
      command.conversationId,
      command.environmentId,
      command.organizationId
    );

    if (!conversation) {
      return { sent: false };
    }

    const channel = this.conversationService.getPrimaryChannel(conversation);

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

    try {
      const text = "Setup complete — I'm listening! Drop me a message to see me in action.";
      await this.outboundGateway.deliver(
        {
          agentId: agent._id,
          integrationIdentifier: command.integrationIdentifier,
          platform: channel.platform,
          platformThreadId: channel.platformThreadId,
        },
        { markdown: text },
        {
          conversationId: conversation._id,
          channel,
          agentIdentifier: command.agentIdentifier,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
        }
      );

      this.analyticsService.track(`Agent Bridge Connected Message Sent - [Agents]`, command.userId, {
        _organization: command.organizationId,
        environmentId: command.environmentId,
        agentIdentifier: command.agentIdentifier,
        integrationIdentifier: command.integrationIdentifier,
        conversationId: conversation._id,
      });

      return { sent: true, conversationId: conversation._id };
    } catch (err) {
      this.logger.warn(err, `Failed to send bridge-connected message for agent "${command.agentIdentifier}"`);

      return { sent: false };
    }
  }
}
