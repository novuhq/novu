import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import {
  ConversationActivityRepository,
  ConversationChannel,
  ConversationEntity,
  ConversationRepository,
} from '@novu/dal';
import { AGENT_AUTH_METADATA_KEYS } from '@novu/shared';
import type { CardElement } from 'chat';
import { AgentConfigResolver } from '../../channels/agent-config-resolver.service';
import { AgentConversationService } from '../conversation/agent-conversation.service';
import { OutboundGateway } from '../egress/outbound.gateway';
import { ConfirmLinkedAuthCardsCommand } from './confirm-linked-auth-cards.command';

/**
 * Real-time "account linked" confirmation. When a chat user links their account,
 * every conversation where they were shown the auth CTA still carries the tracking
 * metadata the framework auth gate wrote (`AGENT_AUTH_METADATA_KEYS`). This use case
 * edits each pending CTA card in place into the frozen confirmation card and clears
 * the metadata so the update is idempotent — a second link event finds nothing.
 *
 * Best-effort by design: it is invoked non-blocking off the linking flow, and a
 * failed edit for one conversation (e.g. the card was deleted on the platform)
 * never aborts the others or the link itself.
 */
@Injectable()
export class ConfirmLinkedAuthCards {
  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    private readonly outboundGateway: OutboundGateway,
    private readonly conversationService: AgentConversationService,
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: ConfirmLinkedAuthCardsCommand): Promise<void> {
    const participantId = `${command.platform}:${command.platformUserId}`;

    const conversations = await this.conversationRepository.findPendingAuthCards({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      integrationId: command.integrationId,
      participantId,
    });

    if (conversations.length === 0) {
      return;
    }

    for (const conversation of conversations) {
      try {
        await this.confirmForConversation(command, conversation);
      } catch (err) {
        this.logger.warn(
          { err: err instanceof Error ? err.message : String(err), conversationId: conversation._id },
          'Failed to confirm linked auth card for conversation; skipping'
        );
      }
    }
  }

  private async confirmForConversation(
    command: ConfirmLinkedAuthCardsCommand,
    conversation: ConversationEntity
  ): Promise<void> {
    const messageId = conversation.metadata?.[AGENT_AUTH_METADATA_KEYS.authCardMessageId];
    const linkedCard = conversation.metadata?.[AGENT_AUTH_METADATA_KEYS.authLinkedCard];

    if (typeof messageId !== 'string' || !messageId || !this.isCard(linkedCard)) {
      return;
    }

    const channel = this.selectChannel(conversation, command.integrationId);
    if (!channel) {
      return;
    }

    // The auth gate persists whatever id `ctx.reply()` returned. On the SDK event-outbox
    // path that is a client-minted id (`msg_…`), not a platform message id — the real
    // platform `ts` lives on the delivered activity keyed by that minted id. Resolve it
    // before editing, otherwise the platform edit fails with `message_not_found`.
    const platformMessageId = await this.resolvePlatformMessageId(command.environmentId, conversation._id, messageId);
    if (!platformMessageId) {
      this.logger.warn(
        { conversationId: conversation._id, messageId },
        'Could not resolve platform message id for pending auth card; skipping edit'
      );

      return;
    }

    const config = await this.agentConfigResolver.resolve(conversation._agentId, command.integrationIdentifier);

    await this.outboundGateway.edit(
      {
        agentId: conversation._agentId,
        integrationIdentifier: command.integrationIdentifier,
        platform: channel.platform,
        platformThreadId: channel.platformThreadId,
        workspaceId: channel.workspace?.id,
      },
      platformMessageId,
      { card: linkedCard },
      {
        conversationId: conversation._id,
        channel,
        agentIdentifier: config.agentIdentifier,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      }
    );

    await this.conversationService.updateMetadata({
      conversationId: conversation._id,
      channel,
      agentIdentifier: config.agentIdentifier,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      currentMetadata: conversation.metadata ?? {},
      ops: [
        { action: 'delete', key: AGENT_AUTH_METADATA_KEYS.authCardMessageId },
        { action: 'delete', key: AGENT_AUTH_METADATA_KEYS.authLinkedCard },
      ],
    });
  }

  /**
   * Translates the persisted auth-card id into the platform message id the edit needs.
   *
   * - SDK event-outbox path: `ctx.reply()` returns a client-minted id and the sink records
   *   it as the delivered activity's `identifier`, with the real platform `ts` on
   *   `platformMessageId`. We look that up here.
   * - HTTP-bridge path: `ctx.reply()` already returns the platform id, so there is no
   *   activity keyed by it — fall back to the stored value unchanged.
   */
  private async resolvePlatformMessageId(
    environmentId: string,
    conversationId: string,
    storedMessageId: string
  ): Promise<string | undefined> {
    const activity = await this.conversationActivityRepository.findOne(
      { _environmentId: environmentId, _conversationId: conversationId, identifier: storedMessageId },
      ['platformMessageId']
    );

    if (activity?.platformMessageId) {
      return activity.platformMessageId;
    }

    return storedMessageId;
  }

  /**
   * Picks the conversation channel bound to the integration that produced this link
   * event so the edit targets the correct platform thread/workspace. Falls back to
   * the primary channel for single-channel conversations.
   */
  private selectChannel(conversation: ConversationEntity, integrationId: string): ConversationChannel | undefined {
    const match = conversation.channels?.find((channel) => String(channel._integrationId) === String(integrationId));

    return match ?? conversation.channels?.[0];
  }

  private isCard(value: unknown): value is CardElement {
    return typeof value === 'object' && value !== null && (value as { type?: string }).type === 'card';
  }
}
