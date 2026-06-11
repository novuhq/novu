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
import { AgentConfigResolver, type ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { InboundAckService } from '../../conversation-runtime/ack/inbound-ack.service';
import { OutboundGateway } from '../../conversation-runtime/egress/outbound.gateway';
import { HandleAgentReply } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { EnsureProviderManagedVault } from '../../mcp/connections/ensure-provider-managed-vault/ensure-provider-managed-vault.usecase';
import { GenerateMcpOAuthUrl } from '../../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import type { McpOAuthState } from '../../mcp/oauth/generate-mcp-oauth-url/mcp-oauth-state';
import { ManagedAgentService } from '../managed-agent.service';
import { mergeToolTrustPatch } from '../tool-approval/tool-trust.helper';
import { listOAuthMcps } from './list-oauth-mcps.helper';
import { ManagedAgentSetupCompleteCommand } from './managed-agent-setup-complete.command';
import { isOAuthMcpPending, type OAuthMcp } from './oauth-mcp.types';
import { buildSetupRowsForMcps, deleteSetupCardIfPresent, syncSetupCardMessage } from './setup-card.builder';

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
    private readonly ensureProviderManagedVault: EnsureProviderManagedVault,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly outboundGateway: OutboundGateway,
    private readonly inboundAck: InboundAckService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  private async persistToolTrustFromSetup(stateData: ManagedAgentSetupCompleteCommand['stateData']): Promise<void> {
    const connection = await this.mcpConnectionRepository.findSubscriberConnection({
      organizationId: stateData.organizationId,
      environmentId: stateData.environmentId,
      agentMcpServerId: stateData.agentMcpServerId,
      subscriberId: stateData.subscriberId,
    });

    if (!connection) {
      this.logger.warn(
        {
          agentMcpServerId: stateData.agentMcpServerId,
          subscriberId: stateData.subscriberId,
          conversationId: stateData.conversationId,
        },
        'Setup-card auto-approve requested but MCP connection row was not found'
      );

      return;
    }

    await this.mcpConnectionRepository.mergeToolTrust({
      connectionId: connection._id,
      environmentId: stateData.environmentId,
      organizationId: stateData.organizationId,
      patch: mergeToolTrustPatch({ scope: 'server' }),
    });
  }

  async refreshPendingSetupCards(params: {
    agentId: string;
    integrationIdentifier: string;
    subscriberExternalId: string;
    mcps: OAuthMcp[];
  }): Promise<void> {
    if (!params.mcps.some(isOAuthMcpPending)) {
      return;
    }

    const config = await this.agentConfigResolver.resolve(params.agentId, params.integrationIdentifier);
    const subscriber = await this.subscriberRepository.findBySubscriberId(
      config.environmentId,
      params.subscriberExternalId
    );

    if (!subscriber?.subscriberId) {
      return;
    }

    await this.refreshSetupCardsForPendingConversations({
      agentId: params.agentId,
      config,
      subscriber,
      mcps: params.mcps,
    });
  }

  /** Rebuild setup cards after OAuth failure or stale callback (setup_card source only). */
  async refreshPendingSetupCardsFromOAuthState(stateData: McpOAuthState): Promise<void> {
    if (!stateData.conversationId || stateData.source !== 'setup_card') {
      return;
    }

    const context = await this.resolveSetupRefreshContextFromState(stateData);

    if (!context || !context.mcps.some(isOAuthMcpPending)) {
      return;
    }

    await this.refreshSetupCardsForPendingConversations({
      agentId: context.agentId,
      config: context.config,
      subscriber: context.subscriber,
      mcps: context.mcps,
    });
  }

  private async resolveSetupRefreshContextFromState(stateData: McpOAuthState): Promise<{
    agentId: string;
    config: ResolvedAgentConfig;
    subscriber: SubscriberEntity;
    mcps: OAuthMcp[];
  } | null> {
    const agent = await this.agentRepository.findOne(
      {
        _id: stateData.agentId,
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
      },
      ['_id', 'identifier', 'managedRuntime']
    );

    if (!agent?.managedRuntime) {
      return null;
    }

    const conversation = await this.conversationRepository.findOne(
      {
        _id: stateData.conversationId,
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
      },
      ['channels']
    );

    const channelIntegrationId = conversation?.channels?.[0]?._integrationId;

    if (!channelIntegrationId) {
      return null;
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
      return null;
    }

    const config = await this.agentConfigResolver.resolve(agent._id, integration.identifier);

    const subscriber = await this.subscriberRepository.findOne({
      _id: stateData.subscriberId,
      _environmentId: stateData.environmentId,
      _organizationId: stateData.organizationId,
    });

    if (!subscriber?.subscriberId) {
      return null;
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

    return { agentId: agent._id, config, subscriber, mcps };
  }

  async execute(command: ManagedAgentSetupCompleteCommand): Promise<void> {
    const { stateData } = command;

    if (!stateData.conversationId) {
      return;
    }

    if (stateData.trustToolsOnConnect) {
      await this.persistToolTrustFromSetup(stateData);
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

    await this.completeAndReplayForAllPendingConversations({
      agentId: agent._id,
      agent,
      config,
      subscriber,
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
      try {
        await this.refreshSetupCardForConversation(conversation, config, subscriber, mcps);
      } catch (err) {
        this.logger.warn(
          err,
          `Failed to refresh managed-agent setup card for conversation ${conversation._id}; continuing batch`
        );
      }
    }
  }

  private async refreshSetupCardForConversation(
    conversation: ConversationEntity,
    config: ResolvedAgentConfig,
    subscriber: SubscriberEntity,
    mcps: OAuthMcp[]
  ): Promise<void> {
    const pending = conversation.pendingManagedAgentSetup;

    if (!pending) {
      return;
    }

    const { rows } = await buildSetupRowsForMcps({
      mcps,
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      agentIdentifier: config.agentIdentifier,
      subscriberId: subscriber.subscriberId,
      conversationId: conversation._id,
      generateMcpOAuthUrl: this.generateMcpOAuthUrl,
      ensureProviderManagedVault: this.ensureProviderManagedVault,
      logger: this.logger,
    });

    const setupMessageId = await syncSetupCardMessage({
      conversationId: conversation._id,
      platform: conversation.channels?.[0]?.platform ?? config.platform,
      organizationId: config.organizationId,
      environmentId: config.environmentId,
      agentIdentifier: config.agentIdentifier,
      integrationIdentifier: config.integrationIdentifier,
      rows,
      pendingState: pending,
      handleAgentReply: this.handleAgentReply,
    });

    await this.conversationRepository.setPendingManagedAgentSetup(
      config.environmentId,
      config.organizationId,
      conversation._id,
      {
        pendingPlatformMessageId: pending.pendingPlatformMessageId,
        setupMessageId,
      }
    );
  }

  private async completeAndReplayForAllPendingConversations(params: {
    agentId: string;
    agent: Pick<AgentEntity, '_id' | 'managedRuntime'>;
    config: ResolvedAgentConfig;
    subscriber: SubscriberEntity;
  }): Promise<void> {
    const { agentId, agent, config, subscriber } = params;

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
  }): Promise<void> {
    const { conversation, pending, agent, config, subscriber } = params;

    await deleteSetupCardIfPresent({
      conversationId: conversation._id,
      agentId: agent._id,
      integrationIdentifier: config.integrationIdentifier,
      platform: config.platform,
      platformThreadId: conversation.channels?.[0]?.platformThreadId,
      pendingState: pending,
      outboundGateway: this.outboundGateway,
      logger: this.logger,
    });

    const dispatchResult = await this.managedAgentService.replayParkedInboundTurn({
      conversation,
      config,
      subscriber,
      pendingPlatformMessageId: pending.pendingPlatformMessageId,
      agent,
    });

    if (!dispatchResult) {
      return;
    }

    await this.conversationRepository.clearPendingManagedAgentSetup(
      config.environmentId,
      config.organizationId,
      conversation._id
    );

    delete conversation.pendingManagedAgentSetup;

    const channel = conversation.channels?.[0];
    const ackParams = {
      agentId: agent._id,
      config,
      platformThreadId: channel?.platformThreadId,
      platformMessageId: pending.pendingPlatformMessageId,
    };

    if (dispatchResult.status === 'active') {
      await this.inboundAck.showWorkingSignal({
        ...ackParams,
        isFirstMessage: channel?.firstPlatformMessageId === pending.pendingPlatformMessageId,
      });
      await this.inboundAck.showQueuedSignal(ackParams);
    } else if (dispatchResult.status === 'queued') {
      await this.inboundAck.showQueuedSignal(ackParams);
    }
  }
}
