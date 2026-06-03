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
import { OutboundGateway } from '../../conversation-runtime/egress/outbound.gateway';
import { HandleAgentReplyCommand } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.command';
import { HandleAgentReply } from '../../conversation-runtime/reply/handle-agent-reply/handle-agent-reply.usecase';
import { EnsureProviderManagedVault } from '../../mcp/connections/ensure-provider-managed-vault/ensure-provider-managed-vault.usecase';
import { GenerateMcpOAuthUrl } from '../../mcp/oauth/generate-mcp-oauth-url/generate-mcp-oauth-url.usecase';
import { CompleteManagedAgentSetup } from './complete-managed-agent-setup.usecase';
import { listOAuthMcps } from './list-oauth-mcps.helper';
import { ManagedAgentSetupInboundCommand } from './managed-agent-setup-inbound.command';
import { isOAuthMcpPending, type OAuthMcp } from './oauth-mcp.types';
import { buildSetupRowsForMcps, deleteSetupCardIfPresent, syncSetupCardMessage } from './setup-card.builder';
import { SETUP_GATE_NUDGE_MARKDOWN } from './setup-card.helpers';

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
    private readonly ensureProviderManagedVault: EnsureProviderManagedVault,
    private readonly handleAgentReply: HandleAgentReply,
    private readonly outboundGateway: OutboundGateway,
    private readonly completeManagedAgentSetup: CompleteManagedAgentSetup,
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

    await this.parkAndPostCard(command, conversation, mcps);

    return true;
  }

  private async parkAndPostCard(
    command: ManagedAgentSetupInboundCommand,
    conversation: ConversationEntity,
    mcps: OAuthMcp[]
  ): Promise<void> {
    const existing = conversation.pendingManagedAgentSetup;
    const isRepeatSetup = Boolean(existing?.setupMessageId);
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

    const { rows, sessionRotated } = await buildSetupRowsForMcps({
      mcps,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentIdentifier: command.agentIdentifier,
      subscriberId: command.subscriberId,
      conversationId: command.conversationId,
      generateMcpOAuthUrl: this.generateMcpOAuthUrl,
      ensureProviderManagedVault: this.ensureProviderManagedVault,
      logger: this.logger,
    });

    const platform = conversation.channels?.[0]?.platform;

    const setupMessageId = await syncSetupCardMessage({
      conversationId: command.conversationId,
      platform,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentIdentifier: command.agentIdentifier,
      integrationIdentifier: command.integrationIdentifier,
      rows,
      pendingState,
      handleAgentReply: this.handleAgentReply,
    });

    await this.conversationRepository.setPendingManagedAgentSetup(
      command.environmentId,
      command.organizationId,
      command.conversationId,
      {
        pendingPlatformMessageId: pendingState.pendingPlatformMessageId,
        setupMessageId: setupMessageId ?? pendingState.setupMessageId,
      }
    );

    if (sessionRotated) {
      await this.completeManagedAgentSetup.refreshPendingSetupCards({
        agentId: command.agentId,
        integrationIdentifier: command.integrationIdentifier,
        subscriberExternalId: command.subscriberId,
        mcps,
      });
    }

    if (isRepeatSetup) {
      await this.sendSetupGateNudge(command);
    }
  }

  private async sendSetupGateNudge(command: ManagedAgentSetupInboundCommand): Promise<void> {
    await this.handleAgentReply.execute(
      HandleAgentReplyCommand.create({
        userId: command.organizationId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        conversationId: command.conversationId,
        agentIdentifier: command.agentIdentifier,
        integrationIdentifier: command.integrationIdentifier,
        reply: { markdown: SETUP_GATE_NUDGE_MARKDOWN },
      })
    );
  }

  private async resolveStaleSetupCard(
    command: ManagedAgentSetupInboundCommand,
    conversation: ConversationEntity
  ): Promise<void> {
    const pending = conversation.pendingManagedAgentSetup;

    if (!pending) {
      return;
    }

    await deleteSetupCardIfPresent({
      conversationId: command.conversationId,
      agentId: command.agentId,
      integrationIdentifier: command.integrationIdentifier,
      platform: conversation.channels?.[0]?.platform,
      platformThreadId: conversation.channels?.[0]?.platformThreadId,
      pendingState: pending,
      outboundGateway: this.outboundGateway,
      logger: this.logger,
    });

    await this.conversationRepository.clearPendingManagedAgentSetup(
      command.environmentId,
      command.organizationId,
      command.conversationId
    );
  }
}
