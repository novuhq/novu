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

import { AgentConfigResolver, type ResolvedAgentConfig } from '../../services/agent-config-resolver.service';
import { ManagedAgentService } from '../../services/managed-agent.service';
import { GenerateMcpOAuthUrl } from '../generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { HandleAgentReplyCommand } from '../handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../handle-agent-reply/handle-agent-reply.usecase';
import { listOAuthMcps } from './list-oauth-mcps.helper';
import { ManagedAgentSetupCompleteCommand } from './managed-agent-setup-complete.command';
import { isOAuthMcpPending, type OAuthMcp } from './oauth-mcp.types';
import { buildSetupCardForMcps } from './setup-card.builder';

/**
 * After an MCP OAuth callback lands, refresh setup cards or replay the
 * parked user turns for this subscriber + agent.
 */
@Injectable()
export class CompleteManagedAgentSetup {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentRepository: AgentRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly managedAgentService: ManagedAgentService,
    private readonly generateMcpOAuthUrl: GenerateMcpOAuthUrl,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ManagedAgentSetupCompleteCommand): Promise<void> {
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

    const mcps = await listOAuthMcps(
      {
        subscriberRepository: this.subscriberRepository,
        agentMcpServerRepository: this.agentMcpServerRepository,
        mcpConnectionRepository: this.mcpConnectionRepository,
      },
      {
        environmentId: stateData.environmentId,
        organizationId: stateData.organizationId,
        agentId: agent._id,
        subscriberId: subscriber.subscriberId,
      }
    );

    if (mcps.some(isOAuthMcpPending)) {
      // Some MCPs still need OAuth — refresh the setup card in each waiting Slack thread.
      await this.refreshSetupCardsForPendingConversations({
        agentId: agent._id,
        config,
        subscriber,
        mcps,
      });

      return;
    }

    if (!conversation.pendingManagedAgentSetup) {
      return;
    }

    // All MCPs connected — show "setup complete" and re-run every held user message.
    await this.completeAndReplayForAllPendingConversations({
      agentId: agent._id,
      agent,
      config,
      subscriber,
      mcps,
    });
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

  private async completeAndReplayForAllPendingConversations(params: {
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

      try {
        await this.completeAndReplay({
          conversation,
          pending,
          agent,
          config,
          subscriber,
          mcps,
        });
      } catch (err) {
        this.logger.warn(
          err,
          `Failed to complete managed-agent setup replay for conversation ${conversation._id}; continuing batch`
        );
      }
    }
  }

  private async completeAndReplay(params: {
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

      try {
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
      } catch (err) {
        this.logger.warn(
          err,
          `Failed to edit managed-agent setup card for conversation ${conversation._id}; continuing replay`
        );
      }
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
