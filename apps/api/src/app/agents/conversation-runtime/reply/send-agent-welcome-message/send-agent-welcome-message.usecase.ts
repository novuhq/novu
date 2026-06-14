import { Injectable } from '@nestjs/common';
import { AnalyticsService, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import {
  AgentRepository,
  ChannelEndpointRepository,
  ConversationParticipantTypeEnum,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { buildConnectSubscriberId } from '@novu/shared';
import type { CardElement } from 'chat';
import { ConnectClaimTokenService } from '../../../../connect/services/connect-claim-token.service';
import { isKeylessOrganization } from '../../../../keyless/keyless-organization.helpers';
import {
  buildConnectClaimUrl,
  buildKeylessWelcomeCard,
  toReplyCard,
} from '../../../../keyless/keyless-signup.helpers';
import { getWelcomeText } from '../../../shared/util/agent-welcome-text';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { PLATFORM_ENDPOINT_CONFIG } from '../../../shared/util/platform-endpoint-config';
import { resolveAgentPlatform } from '../../../shared/util/provider-to-platform';
import { AgentConversationService, getConversationTitle } from '../../conversation/agent-conversation.service';
import { OutboundGateway } from '../../egress/outbound.gateway';
import { SendAgentWelcomeMessageCommand } from './send-agent-welcome-message.command';

@Injectable()
export class SendAgentWelcomeMessage {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly conversationService: AgentConversationService,
    private readonly analyticsService: AnalyticsService,
    private readonly outboundGateway: OutboundGateway,
    private readonly connectClaimTokenService: ConnectClaimTokenService,
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

    const platformUserId = await this.resolvePlatformUserId(command, platform, integration.identifier);
    if (!platformUserId) {
      return { sent: false };
    }

    const welcomeText = getWelcomeText(platform);
    const existingWelcomeConversation = await this.findExistingWelcomeConversation({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
      integrationId: integration._id,
      platform,
      platformUserId,
      welcomeText,
    });

    if (existingWelcomeConversation) {
      return { sent: true, conversationId: existingWelcomeConversation._id };
    }

    try {
      const keylessWelcomeCard = await this.resolveKeylessWelcomeCard(command, welcomeText);
      const welcomeReplyCard = keylessWelcomeCard ? toReplyCard(keylessWelcomeCard) : undefined;
      const welcomeContent = welcomeReplyCard ? { card: welcomeReplyCard } : { markdown: welcomeText };
      const sent = await this.outboundGateway.sendDirectMessage(
        agent._id,
        command.integrationIdentifier,
        platformUserId,
        welcomeContent
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
        richContent: welcomeReplyCard ? { card: welcomeReplyCard } : undefined,
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

  private async resolvePlatformUserId(
    command: SendAgentWelcomeMessageCommand,
    platform: AgentPlatformEnum,
    integrationIdentifier: string
  ): Promise<string | undefined> {
    if (platform === AgentPlatformEnum.EMAIL) {
      return this.resolveEmailWelcomeRecipient(command);
    }

    const endpointConfig = PLATFORM_ENDPOINT_CONFIG[platform];
    if (!endpointConfig) {
      return undefined;
    }

    const endpoint = await this.channelEndpointRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      integrationIdentifier,
      type: endpointConfig.endpointType,
    });

    if (!endpoint) {
      return undefined;
    }

    const platformUserId = (endpoint.endpoint as Record<string, string>)[endpointConfig.identityField];
    if (!platformUserId) {
      return undefined;
    }

    return platformUserId;
  }

  /**
   * Email welcome messages are sent to the dashboard user's `connect:<userId>`
   * subscriber — the same identity used by Telegram/WhatsApp test flows.
   */
  private async resolveEmailWelcomeRecipient(command: SendAgentWelcomeMessageCommand): Promise<string | undefined> {
    const subscriberId = buildConnectSubscriberId(command.userId);
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, subscriberId);

    if (!subscriber) {
      return undefined;
    }

    const email = subscriber.email?.trim();

    if (!email) {
      this.logger.warn(
        `No email on connect subscriber "${subscriberId}" — welcome email skipped for agent "${command.agentIdentifier}"`
      );

      return undefined;
    }

    return email;
  }

  private async findExistingWelcomeConversation(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    integrationId: string;
    platform: AgentPlatformEnum;
    platformUserId: string;
    welcomeText: string;
  }) {
    const participantId = `${params.platform}:${params.platformUserId}`;
    const welcomeTitle = getConversationTitle(params.welcomeText);

    return this.conversationService.findByAgentIntegrationParticipant({
      environmentId: params.environmentId,
      organizationId: params.organizationId,
      agentId: params.agentId,
      integrationId: params.integrationId,
      participantId,
      participantType: ConversationParticipantTypeEnum.PLATFORM_USER,
      title: welcomeTitle,
    });
  }

  private async resolveKeylessWelcomeCard(
    command: SendAgentWelcomeMessageCommand,
    welcomeText: string
  ): Promise<CardElement | null> {
    if (!isKeylessOrganization(command.organizationId)) {
      return null;
    }

    try {
      const { token } = await this.connectClaimTokenService.issueOrGetForEnvironment({
        env: command.environmentId,
        org: command.organizationId,
      });
      const claimUrl = buildConnectClaimUrl(token);

      return buildKeylessWelcomeCard(welcomeText, claimUrl);
    } catch (err) {
      this.logger.warn(
        err,
        `Failed to build keyless welcome signup link for agent "${command.agentIdentifier}" — sending plain welcome`
      );

      return null;
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
