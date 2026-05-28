import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentMcpServerRepository,
  ConversationEntity,
  ConversationRepository,
  McpConnectionRepository,
  PendingManagedAgentSetup,
  SubscriberRepository,
} from '@novu/dal';

import { GenerateMcpOAuthUrl } from '../generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { HandleAgentReplyCommand } from '../handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../handle-agent-reply/handle-agent-reply.usecase';
import { listOAuthMcps } from './list-oauth-mcps.helper';
import { ManagedAgentSetupInboundCommand } from './managed-agent-setup-inbound.command';
import { isOAuthMcpPending, type OAuthMcp } from './oauth-mcp.types';
import { buildSetupCardForMcps } from './setup-card.builder';

/**
 * Inbound gate for managed agents: park the user turn and post/edit a setup
 * card when the subscriber still owes OAuth MCP authorisation. Returns
 * `true` when dispatch must not proceed.
 */
@Injectable()
export class HandleManagedAgentSetupInbound {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly generateMcpOAuthUrl: GenerateMcpOAuthUrl,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ManagedAgentSetupInboundCommand): Promise<boolean> {
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

    const mcps = await listOAuthMcps(
      {
        subscriberRepository: this.subscriberRepository,
        agentMcpServerRepository: this.agentMcpServerRepository,
        mcpConnectionRepository: this.mcpConnectionRepository,
      },
      {
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentId: command.agentId,
        subscriberId: command.subscriberId,
      }
    );
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

    await this.parkAndPostCard(command, conversation, mcps);

    return true;
  }

  private async parkAndPostCard(
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
}
