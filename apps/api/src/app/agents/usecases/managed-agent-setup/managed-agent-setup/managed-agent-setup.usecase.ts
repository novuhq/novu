import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentEntity,
  AgentRepository,
  ConversationEntity,
  ConversationRepository,
  IntegrationRepository,
  PendingManagedAgentSetup,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';

import { AgentConfigResolver, type ResolvedAgentConfig } from '../../../services/agent-config-resolver.service';
import { ManagedAgentService } from '../../../services/managed-agent.service';
import { GenerateMcpOAuthUrl } from '../../generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { HandleAgentReplyCommand } from '../../handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../../handle-agent-reply/handle-agent-reply.usecase';
import { ListPendingOAuthMcpsCommand } from '../list-pending-oauth-mcps/list-pending-oauth-mcps.command';
import { ListPendingOAuthMcps } from '../list-pending-oauth-mcps/list-pending-oauth-mcps.usecase';
import { ManagedAgentSetupCompleteCommand } from './managed-agent-setup-complete.command';
import { ManagedAgentSetupInboundCommand } from './managed-agent-setup-inbound.command';
import { buildSetupCardForPendingMcps } from './setup-card.builder';
import { buildSetupCard } from './setup-card.helpers';

@Injectable()
export class ManagedAgentSetup {
  constructor(
    private readonly listPendingOAuthMcps: ListPendingOAuthMcps,
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

    const listCommand = ListPendingOAuthMcpsCommand.create({
      userId: command.userId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: command.agentId,
      subscriberId: command.subscriberId,
    });

    const pendingMcps = await this.listPendingOAuthMcps.execute(listCommand);
    const setupRequired = pendingMcps.length > 0;

    if (!setupRequired && conversation.pendingManagedAgentSetup) {
      await this.resolveStaleSetupCard(command, conversation);
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

    await this.parkInboundForSetup(command, conversation, listCommand);

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

    const listCommand = ListPendingOAuthMcpsCommand.create({
      userId: 'system',
      environmentId: stateData.environmentId,
      organizationId: stateData.organizationId,
      agentId: agent._id,
      subscriberId: subscriber.subscriberId,
    });

    const pendingMcps = await this.listPendingOAuthMcps.execute(listCommand);
    const setupRequired = pendingMcps.length > 0;

    if (setupRequired) {
      await this.refreshSetupCardForConversation(conversation, config, subscriber);

      return;
    }

    const pending = conversation.pendingManagedAgentSetup;

    if (!pending) {
      return;
    }

    await this.completeSetupAndReplay({
      conversation,
      pending,
      agent,
      config,
      subscriber,
    });
  }

  private buildReplyBaseCommand(command: ManagedAgentSetupInboundCommand) {
    return {
      userId: 'system',
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      conversationId: command.conversationId,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
    };
  }

  private async parkInboundForSetup(
    command: ManagedAgentSetupInboundCommand,
    conversation: ConversationEntity,
    listCommand: ListPendingOAuthMcpsCommand
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

    const pendingMcps = await this.listPendingOAuthMcps.execute(listCommand);
    const card = await buildSetupCardForPendingMcps({
      pendingMcps,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      subscriberId: command.subscriberId,
      conversationId: command.conversationId,
      generateMcpOAuthUrl: this.generateMcpOAuthUrl,
      logger: this.logger,
    });

    const baseCommand = this.buildReplyBaseCommand(command);

    if (pendingState.setupMessageId) {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          ...baseCommand,
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
        ...baseCommand,
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

  private async resolveStaleSetupCard(
    command: ManagedAgentSetupInboundCommand,
    conversation: ConversationEntity
  ): Promise<void> {
    const setupMessageId = conversation.pendingManagedAgentSetup?.setupMessageId;

    if (!setupMessageId) {
      return;
    }

    const card = buildSetupCard({ connectActions: [], resolved: true });

    try {
      await this.handleAgentReply.execute(
        HandleAgentReplyCommand.create({
          ...this.buildReplyBaseCommand(command),
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

  private async refreshSetupCardForConversation(
    conversation: ConversationEntity,
    config: ResolvedAgentConfig,
    subscriber: SubscriberEntity
  ): Promise<void> {
    const setupMessageId = conversation.pendingManagedAgentSetup?.setupMessageId;

    if (!setupMessageId) {
      return;
    }

    const listCommand = ListPendingOAuthMcpsCommand.create({
      userId: 'system',
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      agentId: conversation._agentId,
      subscriberId: subscriber.subscriberId,
    });
    const pendingMcps = await this.listPendingOAuthMcps.execute(listCommand);

    const card = await buildSetupCardForPendingMcps({
      pendingMcps,
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
  }): Promise<void> {
    const { conversation, pending, agent, config, subscriber } = params;

    if (pending.setupMessageId) {
      const resolvedCard = buildSetupCard({ connectActions: [], resolved: true });

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
