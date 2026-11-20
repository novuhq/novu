import { Injectable } from '@nestjs/common';
import { AnalyticsService, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import {
  AgentRepository,
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ConversationParticipantTypeEnum,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { SLACK_AGENT_WELCOME_SUGGESTED_PROMPTS, SLACK_AGENT_WELCOME_SUGGESTED_PROMPTS_TITLE } from '@novu/shared';
import { ConnectClaimTokenService } from '../../../../connect/services/connect-claim-token.service';
import { isKeylessOrganization } from '../../../../keyless/keyless-organization.helpers';
import { buildConnectClaimUrl, buildKeylessWelcomeCard } from '../../../../keyless/keyless-signup.helpers';
import { AgentPlatformEnum } from '../../../shared/enums/agent-platform.enum';
import { getWelcomeText } from '../../../shared/util/agent-welcome-text';
import { PLATFORM_ENDPOINT_CONFIG } from '../../../shared/util/platform-endpoint-config';
import { resolveAgentPlatform } from '../../../shared/util/provider-to-platform';
import { AgentConversationService, getConversationTitle } from '../../conversation/agent-conversation.service';
import { OutboundGateway } from '../../egress/outbound.gateway';
import { SendAgentWelcomeMessageCommand } from './send-agent-welcome-message.command';

type WelcomeRecipient = {
  platformUserId: string;
  /** Slack team_id (or equivalent) when the endpoint is tied to a workspace connection. */
  workspaceId?: string;
};

@Injectable()
export class SendAgentWelcomeMessage {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
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
  async execute(
    command: SendAgentWelcomeMessageCommand
  ): Promise<{ sent: boolean; conversationId?: string; claimToken?: string }> {
    if (command.conversationId) {
      return this.sendBridgeConnectedMessage(command as SendAgentWelcomeMessageCommand & { conversationId: string });
    }

    return this.sendWelcomeMessage(command);
  }

  private async sendWelcomeMessage(
    command: SendAgentWelcomeMessageCommand
  ): Promise<{ sent: boolean; conversationId?: string; claimToken?: string }> {
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

    const recipient = await this.resolveWelcomeRecipient(command, platform, integration.identifier);
    if (!recipient) {
      return { sent: false };
    }

    const { platformUserId, workspaceId } = recipient;
    const welcomeText = getWelcomeText(platform);
    const claimToken = await this.resolveKeylessClaimToken(command);
    const existingWelcomeConversation = await this.findExistingWelcomeConversation({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
      integrationId: integration._id,
      platform,
      platformUserId,
      welcomeText,
      workspaceId,
    });

    if (existingWelcomeConversation) {
      return { sent: true, conversationId: existingWelcomeConversation._id, ...withClaimToken(claimToken) };
    }

    try {
      const welcomeReplyCard = claimToken
        ? buildKeylessWelcomeCard(welcomeText, buildConnectClaimUrl(claimToken))
        : undefined;
      const welcomeContent = welcomeReplyCard ? { card: welcomeReplyCard } : { markdown: welcomeText };
      const sent = await this.outboundGateway.sendDirectMessage(
        agent._id,
        command.integrationIdentifier,
        platformUserId,
        welcomeContent,
        workspaceId
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
        workspaceId,
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

      if (platform === AgentPlatformEnum.SLACK) {
        await this.outboundGateway.setSlackSuggestedPrompts(
          agent._id,
          command.integrationIdentifier,
          platformThreadId,
          SLACK_AGENT_WELCOME_SUGGESTED_PROMPTS,
          SLACK_AGENT_WELCOME_SUGGESTED_PROMPTS_TITLE,
          workspaceId
        );
      }

      this.analyticsService.track(`Agent Welcome Message Sent - [Agents]`, command.userId, {
        _organization: command.organizationId,
        environmentId: command.environmentId,
        agentIdentifier: command.agentIdentifier,
        integrationIdentifier: command.integrationIdentifier,
        platform,
      });

      return { sent: true, conversationId: conversation._id, ...withClaimToken(claimToken) };
    } catch (err) {
      this.logger.warn(err, `Failed to send welcome message for agent "${command.agentIdentifier}"`);

      return { sent: false, ...withClaimToken(claimToken) };
    }
  }

  private async resolveWelcomeRecipient(
    command: SendAgentWelcomeMessageCommand,
    platform: AgentPlatformEnum,
    integrationIdentifier: string
  ): Promise<WelcomeRecipient | undefined> {
    if (platform === AgentPlatformEnum.EMAIL) {
      return this.resolveEmailWelcomeRecipient(command);
    }

    const endpointConfig = PLATFORM_ENDPOINT_CONFIG[platform];
    if (!endpointConfig) {
      return undefined;
    }

    // Prefer the most recently created endpoint so a just-completed OAuth install wins over older
    // workspaces on the same integration (multi-workspace shared Slack app).
    const endpoint = await this.channelEndpointRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        integrationIdentifier,
        type: endpointConfig.endpointType,
      },
      undefined,
      { query: { sort: { createdAt: -1 } } }
    );

    if (!endpoint) {
      return undefined;
    }

    const platformUserId = (endpoint.endpoint as Record<string, string>)[endpointConfig.identityField];
    if (!platformUserId) {
      return undefined;
    }

    const workspaceId = await this.resolveWorkspaceIdForEndpoint(
      command.environmentId,
      command.organizationId,
      endpoint.connectionIdentifier
    );

    return { platformUserId, workspaceId };
  }

  /**
   * Resolve the Slack (etc.) workspace id from the channel connection linked to the endpoint.
   * Required so proactive welcome DMs bind the bot token for the workspace that was just connected,
   * not the integration's first installed workspace.
   */
  private async resolveWorkspaceIdForEndpoint(
    environmentId: string,
    organizationId: string,
    connectionIdentifier?: string
  ): Promise<string | undefined> {
    if (!connectionIdentifier) {
      return undefined;
    }

    const connection = await this.channelConnectionRepository.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        identifier: connectionIdentifier,
      },
      'workspace'
    );

    return connection?.workspace?.id;
  }

  /**
   * Email welcome messages are sent to the dashboard user's subscriber
   * (the same identity used by Telegram/WhatsApp test flows and workflow testing).
   */
  private async resolveEmailWelcomeRecipient(
    command: SendAgentWelcomeMessageCommand
  ): Promise<WelcomeRecipient | undefined> {
    const subscriberId = command.userId;
    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, subscriberId);

    if (!subscriber) {
      return undefined;
    }

    const email = subscriber.email?.trim();

    if (!email) {
      this.logger.warn(
        `No email on dashboard subscriber "${subscriberId}" — welcome email skipped for agent "${command.agentIdentifier}"`
      );

      return undefined;
    }

    return { platformUserId: email };
  }

  private async findExistingWelcomeConversation(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    integrationId: string;
    platform: AgentPlatformEnum;
    platformUserId: string;
    welcomeText: string;
    workspaceId?: string;
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
      workspaceId: params.workspaceId,
    });
  }

  private async resolveKeylessClaimToken(command: SendAgentWelcomeMessageCommand): Promise<string | undefined> {
    if (!isKeylessOrganization(command.organizationId)) {
      return undefined;
    }

    try {
      const { token } = await this.connectClaimTokenService.issueOrGetForEnvironment({
        env: command.environmentId,
        org: command.organizationId,
      });

      return token;
    } catch (err) {
      this.logger.warn(
        err,
        `Failed to issue keyless claim token for agent "${command.agentIdentifier}" — sending welcome without a signup link`
      );

      return undefined;
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

function withClaimToken(claimToken: string | undefined): { claimToken?: string } {
  if (!claimToken) {
    return {};
  }

  return { claimToken };
}
