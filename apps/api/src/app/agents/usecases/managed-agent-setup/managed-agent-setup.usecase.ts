import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentEntity,
  AgentMcpServerRepository,
  AgentRepository,
  ConversationEntity,
  ConversationRepository,
  IntegrationRepository,
  McpConnectionRepository,
  PendingManagedAgentSetup,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { MCP_SERVERS, McpConnectionStatusEnum } from '@novu/shared';

import { AgentConfigResolver, type ResolvedAgentConfig } from '../../services/agent-config-resolver.service';
import { ManagedAgentService } from '../../services/managed-agent.service';
import { GenerateMcpOAuthUrl } from '../generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { HandleAgentReplyCommand } from '../handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../handle-agent-reply/handle-agent-reply.usecase';
import { ManagedAgentSetupCompleteCommand } from './managed-agent-setup-complete.command';
import { ManagedAgentSetupInboundCommand } from './managed-agent-setup-inbound.command';
import { isOAuthMcpPending, type OAuthMcp } from './oauth-mcp.types';
import { buildSetupCardForMcps } from './setup-card.builder';

@Injectable()
export class ManagedAgentSetup {
  constructor(
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly managedAgentService: ManagedAgentService,
    private readonly generateMcpOAuthUrl: GenerateMcpOAuthUrl,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Parks the inbound turn when subscriber setup is still required.
   * Returns `true` when dispatch must not proceed.
   */
  async handleInbound(command: ManagedAgentSetupInboundCommand): Promise<boolean> {
    const conversation = await this.conversationRepository.findOne(
      {
        _id: command.conversationId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!conversation) {
      return false;
    }

    const mcps = await this.listOAuthMcps({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: command.agentId,
      subscriberId: command.subscriberId,
    });
    const setupRequired = mcps.some(isOAuthMcpPending);

    if (!setupRequired && conversation.pendingManagedAgentSetup) {
      await this.resolveStaleSetupCard(command, conversation, mcps);
    }

    if (!setupRequired) {
      return false;
    }

    if (!command.platformMessageId) {
      this.logger.warn(
        { conversationId: command.conversationId },
        'Managed agent setup required but inbound platform message id was not provided'
      );

      return false;
    }

    await this.parkInboundForSetup(command, conversation, mcps);

    return true;
  }

  /**
   * After a setup step completes in-thread, refresh the setup card or replay the parked turn.
   */
  async handleOAuthConnect(command: ManagedAgentSetupCompleteCommand): Promise<void> {
    const { stateData } = command;

    if (!stateData.conversationId) {
      return;
    }

    const conversation = await this.conversationRepository.findOne(
      {
        _id: stateData.conversationId,
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
      },
      '*'
    );

    if (!conversation) {
      return;
    }

    const agent = await this.agentRepository.findOne(
      {
        _id: stateData.agentId,
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
      },
      ['_id', 'identifier', 'runtime', 'managedRuntime']
    );

    if (!agent?.managedRuntime) {
      return;
    }

    const channelIntegrationId = conversation.channels?.[0]?._integrationId;

    if (!channelIntegrationId) {
      return;
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: channelIntegrationId,
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
      },
      ['identifier']
    );

    if (!integration?.identifier) {
      return;
    }

    const config = await this.agentConfigResolver.resolve(agent._id, integration.identifier);

    const subscriber = await this.subscriberRepository.findOne({
      _id: stateData.subscriberId,
      _environmentId: stateData.environmentId,
      _organizationId: stateData.organizationId,
    });

    if (!subscriber?.subscriberId) {
      return;
    }

    const mcps = await this.listOAuthMcps({
      environmentId: stateData.environmentId,
      organizationId: stateData.organizationId,
      agentId: agent._id,
      subscriberId: subscriber.subscriberId,
    });

    if (mcps.some(isOAuthMcpPending)) {
      await this.refreshSetupCardsForPendingConversations({
        agentId: agent._id,
        config,
        subscriber,
        mcps,
      });

      return;
    }

    const pending = conversation.pendingManagedAgentSetup;

    if (!pending) {
      return;
    }

    await this.completeSetupAndReplayForAllPendingConversations({
      agentId: agent._id,
      agent,
      config,
      subscriber,
      mcps,
    });
  }

  private async listOAuthMcps(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
  }): Promise<OAuthMcp[]> {
    const subscriber = await this.subscriberRepository.findBySubscriberId(params.environmentId, params.subscriberId);

    if (!subscriber) {
      return [];
    }

    const enablements = await this.agentMcpServerRepository.findOAuthEnablementsForAgent({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      agentId: params.agentId,
    });

    if (enablements.length === 0) {
      return [];
    }

    const connections = await this.mcpConnectionRepository.findSubscriberConnectionsForAgent({
      organizationId: params.organizationId,
      environmentId: params.environmentId,
      subscriberId: subscriber._id,
      agentMcpServerIds: enablements.map((row) => row._id),
    });

    const connectionByEnablementId = new Map(connections.map((row) => [row._agentMcpServerId, row]));
    const rows: OAuthMcp[] = [];

    for (const enablement of enablements) {
      const connection = connectionByEnablementId.get(enablement._id);
      const catalog = MCP_SERVERS.find((entry) => entry.id === enablement.mcpId);
      const status = connection?.status as McpConnectionStatusEnum | undefined;
      const isError =
        status === McpConnectionStatusEnum.Error ||
        status === McpConnectionStatusEnum.Expired ||
        status === McpConnectionStatusEnum.Revoked;

      rows.push({
        mcpId: enablement.mcpId,
        name: catalog?.name ?? enablement.mcpId,
        agentMcpServerId: enablement._id,
        status,
        ...(isError ? { errorMessage: connection?.lastError?.message ?? 'Connection failed' } : {}),
      });
    }

    return rows;
  }

  private async parkInboundForSetup(
    command: ManagedAgentSetupInboundCommand,
    conversation: ConversationEntity,
    mcps: OAuthMcp[]
  ): Promise<void> {
    const existing = conversation.pendingManagedAgentSetup;
    const pendingState: PendingManagedAgentSetup = {
      pendingPlatformMessageId: command.platformMessageId,
      setupMessageId: existing?.setupMessageId,
    };

    await this.conversationRepository.setPendingManagedAgentSetup(
      command.environmentId,
      command.organizationId,
      command.conversationId,
      pendingState
    );

    const card = await buildSetupCardForMcps({
      mcps,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      subscriberId: command.subscriberId,
      conversationId: command.conversationId,
      generateMcpOAuthUrl: this.generateMcpOAuthUrl,
      logger: this.logger,
    });

    const replyCommandBase = {
      userId: 'system',
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      conversationId: command.conversationId,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
    };

    if (pendingState.setupMessageId) {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          ...replyCommandBase,
          edit: {
            messageId: pendingState.setupMessageId,
            content: { card },
          },
        })
      );

      return;
    }

    const sent = await this.handleAgentReply.execute(
      HandleAgentReplyCommand.create({
        ...replyCommandBase,
        reply: { card },
      })
    );

    if (!sent?.messageId) {
      this.logger.warn(
        { conversationId: command.conversationId },
        'Managed agent setup card posted without a platform message id'
      );

      return;
    }

    await this.conversationRepository.setPendingManagedAgentSetup(
      command.environmentId,
      command.organizationId,
      command.conversationId,
      {
        ...pendingState,
        setupMessageId: sent.messageId,
      }
    );
  }

  private async completeSetupAndReplayForAllPendingConversations(params: {
    agentId: string;
    agent: Pick<AgentEntity, '_id' | 'managedRuntime'>;
    config: ResolvedAgentConfig;
    subscriber: SubscriberEntity;
    mcps: OAuthMcp[];
  }): Promise<void> {
    const { agentId, agent, config, subscriber, mcps } = params;

    if (!subscriber.subscriberId) {
      return;
    }

    const conversations = await this.conversationRepository.findWithPendingManagedAgentSetup(
      config.environmentId,
      config.organizationId,
      agentId,
      subscriber.subscriberId
    );

    for (const conversation of conversations) {
      const pending = conversation.pendingManagedAgentSetup;

      if (!pending) {
        continue;
      }

      await this.completeSetupAndReplay({
        conversation,
        pending,
        agent,
        config,
        subscriber,
        mcps,
      });
    }
  }

  private async resolveStaleSetupCard(
    command: ManagedAgentSetupInboundCommand,
    conversation: ConversationEntity,
    mcps: OAuthMcp[]
  ): Promise<void> {
    const setupMessageId = conversation.pendingManagedAgentSetup?.setupMessageId;

    if (!setupMessageId) {
      return;
    }

    const card = await buildSetupCardForMcps({
      mcps,
      resolved: true,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      subscriberId: command.subscriberId,
      conversationId: command.conversationId,
      generateMcpOAuthUrl: this.generateMcpOAuthUrl,
      logger: this.logger,
    });

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: 'system',
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          conversationId: command.conversationId,
          agentIdentifier: command.agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
          edit: {
            messageId: setupMessageId,
            content: { card },
          },
        })
      );
    } catch (err) {
      this.logger.warn(
        err,
        `Failed to resolve stale managed-agent setup card for conversation ${command.conversationId}`
      );
    }

    await this.conversationRepository.clearPendingManagedAgentSetup(
      command.environmentId,
      command.organizationId,
      command.conversationId
    );
  }

  private async refreshSetupCardsForPendingConversations(params: {
    agentId: string;
    config: ResolvedAgentConfig;
    subscriber: SubscriberEntity;
    mcps: OAuthMcp[];
  }): Promise<void> {
    const { agentId, config, subscriber, mcps } = params;

    if (!subscriber.subscriberId) {
      return;
    }

    const conversations = await this.conversationRepository.findWithPendingManagedAgentSetup(
      config.environmentId,
      config.organizationId,
      agentId,
      subscriber.subscriberId
    );

    for (const conversation of conversations) {
      await this.refreshSetupCardForConversation(conversation, config, subscriber, mcps);
    }
  }

  private async refreshSetupCardForConversation(
    conversation: ConversationEntity,
    config: ResolvedAgentConfig,
    subscriber: SubscriberEntity,
    mcps: OAuthMcp[]
  ): Promise<void> {
    const setupMessageId = conversation.pendingManagedAgentSetup?.setupMessageId;

    if (!setupMessageId) {
      return;
    }

    const card = await buildSetupCardForMcps({
      mcps,
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      agentIdentifier: config.agentIdentifier,
      subscriberId: subscriber.subscriberId,
      conversationId: conversation._id,
      generateMcpOAuthUrl: this.generateMcpOAuthUrl,
      logger: this.logger,
    });

    await this.handleAgentReply.execute(
      HandleAgentReplyCommand.create({
        userId: 'system',
        organizationId: config.organizationId,
        environmentId: config.environmentId,
        conversationId: conversation._id,
        agentIdentifier: config.agentIdentifier,
        integrationIdentifier: config.integrationIdentifier,
        edit: {
          messageId: setupMessageId,
          content: { card },
        },
      })
    );
  }

  private async completeSetupAndReplay(params: {
    conversation: ConversationEntity;
    pending: PendingManagedAgentSetup;
    agent: Pick<AgentEntity, '_id' | 'managedRuntime'>;
    config: ResolvedAgentConfig;
    subscriber: SubscriberEntity;
    mcps: OAuthMcp[];
  }): Promise<void> {
    const { conversation, pending, agent, config, subscriber, mcps } = params;

    if (pending.setupMessageId) {
      const resolvedCard = await buildSetupCardForMcps({
        mcps,
        resolved: true,
        environmentId: config.environmentId,
        organizationId: config.organizationId,
        agentIdentifier: config.agentIdentifier,
        subscriberId: subscriber.subscriberId,
        conversationId: conversation._id,
        generateMcpOAuthUrl: this.generateMcpOAuthUrl,
        logger: this.logger,
      });

      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          userId: 'system',
          organizationId: config.organizationId,
          environmentId: config.environmentId,
          conversationId: conversation._id,
          agentIdentifier: config.agentIdentifier,
          integrationIdentifier: config.integrationIdentifier,
          edit: {
            messageId: pending.setupMessageId,
            content: { card: resolvedCard },
          },
        })
      );
    }

    await this.conversationRepository.clearPendingManagedAgentSetup(
      config.environmentId,
      config.organizationId,
      conversation._id
    );

    delete conversation.pendingManagedAgentSetup;

    await this.managedAgentService.replayParkedInboundTurn({
      conversation,
      config,
      subscriber,
      pendingPlatformMessageId: pending.pendingPlatformMessageId,
      agent,
    });
  }
}
