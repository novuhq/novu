import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionResponse, HumanInteractionStatusEnum } from '@novu/shared';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import type { ConversationTurn } from '../conversation-runtime/runtime/conversation-turn';
import { applyPlatformThreadIdToThread } from '../conversation-runtime/runtime/platform-thread.util';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { parseHumanActionId } from './human-action-id';
import { buildDisambiguationCard } from './human-card.builder';
import { HumanInteractionSettlementService } from './human-interaction-settlement.service';

const DISAMBIGUATION_CACHE_TTL_SECONDS = 10 * 60;

export type HumanInboundMode = 'relay' | 'conversation';

export type HumanInboundResult =
  | { outcome: 'ignored' }
  | { outcome: 'consumed' }
  | { outcome: 'settled'; settled: HumanInteractionEntity };

/**
 * Shared settlement/correlation for human-interaction cards. Used by the
 * `human_relay` runtime (CLI DMs) and by conversation-mode inbound on
 * custom code agents.
 */
@Injectable()
export class HumanInteractionInboundService {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly settlement: HumanInteractionSettlementService,
    private readonly outboundGateway: OutboundGateway,
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async tryHandleAction(turn: ConversationTurn, mode: HumanInboundMode): Promise<HumanInboundResult> {
    const parsed = parseHumanActionId(turn.action?.id);
    if (!parsed) {
      return { outcome: 'ignored' };
    }

    const environmentId = turn.config.environmentId;
    const interaction = await this.humanInteractionRepository.findByIdentifier(environmentId, parsed.identifier);

    if (!interaction) {
      this.logger.warn(
        { actionId: turn.action?.id, environmentId },
        'Human action click referenced an unknown interaction'
      );

      return { outcome: 'consumed' };
    }

    if (!this.isAddressedHuman(turn, interaction)) {
      await this.rejectForeignResponder(turn, interaction);

      return { outcome: 'consumed' };
    }

    if (parsed.type === 'disambiguation-pick') {
      const settled = await this.handleDisambiguationPick(turn, interaction, mode);

      return settled ? { outcome: 'settled', settled } : { outcome: 'consumed' };
    }

    const current = await this.settlement.expireIfOverdue(interaction);
    if (current.status !== HumanInteractionStatusEnum.PENDING) {
      return this.consumeNonPending(turn, current);
    }

    const respondedBy = this.resolveResponder(turn);
    let settled: HumanInteractionEntity | null = null;

    if (parsed.type === 'approve' || parsed.type === 'deny') {
      settled = await this.settlement.settle(
        current,
        parsed.type === 'approve' ? HumanInteractionStatusEnum.APPROVED : HumanInteractionStatusEnum.DENIED,
        this.buildResponse({ type: 'option', optionId: parsed.type, respondedBy })
      );
    } else if (parsed.type === 'option') {
      const known = current.options?.some((option) => option.id === parsed.optionId);
      if (!known) {
        this.logger.warn(
          { interactionIdentifier: current.identifier, optionId: parsed.optionId },
          'Choose click carried an unknown option id'
        );

        return { outcome: 'consumed' };
      }

      settled = await this.settlement.settle(
        current,
        HumanInteractionStatusEnum.ANSWERED,
        this.buildResponse({ type: 'option', optionId: parsed.optionId, respondedBy })
      );
    }

    if (!settled) {
      const latest = await this.humanInteractionRepository.findByIdentifier(environmentId, parsed.identifier);
      if (latest && latest.status !== HumanInteractionStatusEnum.PENDING) {
        return this.consumeNonPending(turn, latest);
      }

      return { outcome: 'consumed' };
    }

    return { outcome: 'settled', settled };
  }

  async tryHandleMessage(turn: ConversationTurn, mode: HumanInboundMode): Promise<HumanInboundResult> {
    const text = turn.message?.text?.trim();
    if (!text) {
      return { outcome: 'ignored' };
    }

    const environmentId = turn.config.environmentId;

    const repliedTo = this.extractRepliedToMessageIds(turn);
    if (repliedTo.length > 0) {
      const exact = await this.humanInteractionRepository.findPendingByPlatformMessageId(environmentId, repliedTo);
      if (exact) {
        const settled = await this.settleAskWithText(exact, text, turn, mode);

        return settled ? { outcome: 'settled', settled } : { outcome: 'consumed' };
      }
    }

    const pendingAsks = await this.loadPendingAsks(turn, mode);
    if (pendingAsks === null) {
      return { outcome: 'ignored' };
    }

    if (pendingAsks.length === 0) {
      if (mode === 'relay') {
        await this.replyOnThread(turn, 'Nothing is waiting for your reply right now.');

        return { outcome: 'consumed' };
      }

      return { outcome: 'ignored' };
    }

    if (pendingAsks.length === 1) {
      const settled = await this.settleAskWithText(pendingAsks[0], text, turn, mode);

      return settled ? { outcome: 'settled', settled } : { outcome: 'consumed' };
    }

    await this.cacheService.set(this.disambiguationCacheKey(turn.conversation._id), JSON.stringify({ text }), {
      ttl: DISAMBIGUATION_CACHE_TTL_SECONDS,
    });

    applyPlatformThreadIdToThread(turn.thread, turn.platformThreadId);
    await this.outboundGateway.replyOnThreadWithCard(turn.thread, buildDisambiguationCard(pendingAsks), {
      failSoft: true,
      actionTokenBinding: {
        agentId: turn.agentId,
        environmentId: turn.config.environmentId,
        organizationId: turn.config.organizationId,
        integrationIdentifier: turn.config.integrationIdentifier,
      },
    });

    return { outcome: 'consumed' };
  }

  private async loadPendingAsks(
    turn: ConversationTurn,
    mode: HumanInboundMode
  ): Promise<HumanInteractionEntity[] | null> {
    const environmentId = turn.config.environmentId;

    if (mode === 'conversation') {
      return this.expireOverdue(
        await this.humanInteractionRepository.findPendingAsksByConversation(environmentId, turn.conversation._id)
      );
    }

    const subscriberId = turn.subscriber?.subscriberId;
    if (!subscriberId) {
      return null;
    }

    return this.expireOverdue(await this.humanInteractionRepository.findPendingAsks(environmentId, subscriberId));
  }

  private async handleDisambiguationPick(
    turn: ConversationTurn,
    interaction: HumanInteractionEntity,
    mode: HumanInboundMode
  ): Promise<HumanInteractionEntity | null> {
    const cacheKey = this.disambiguationCacheKey(turn.conversation._id);
    const cached = await this.cacheService.get(cacheKey);

    if (!cached) {
      await this.replyOnThread(
        turn,
        'I lost track of that reply — please answer again by replying directly to the question message.'
      );

      return null;
    }

    const { text } = JSON.parse(cached) as { text: string };
    await this.cacheService.del(cacheKey);

    const current = await this.settlement.expireIfOverdue(interaction);
    if (current.status !== HumanInteractionStatusEnum.PENDING) {
      await this.replyOnThread(turn, this.lateClickReply(current));

      return current.status === HumanInteractionStatusEnum.EXPIRED ? current : null;
    }

    return this.settleAskWithText(current, text, turn, mode);
  }

  private async settleAskWithText(
    interaction: HumanInteractionEntity,
    text: string,
    turn: ConversationTurn,
    mode: HumanInboundMode
  ): Promise<HumanInteractionEntity | null> {
    if (!this.isAddressedHuman(turn, interaction)) {
      await this.rejectForeignResponder(turn, interaction);

      return null;
    }

    const current = await this.settlement.expireIfOverdue(interaction);
    if (current.status !== HumanInteractionStatusEnum.PENDING) {
      await this.replyOnThread(turn, this.lateClickReply(current));

      return current.status === HumanInteractionStatusEnum.EXPIRED ? current : null;
    }

    const settled = await this.settlement.settle(
      current,
      HumanInteractionStatusEnum.ANSWERED,
      this.buildResponse({ type: 'text', text, respondedBy: this.resolveResponder(turn) })
    );

    if (settled && mode === 'relay') {
      await this.replyOnThread(turn, '✅ Got it — passed along.');
    }

    return settled;
  }

  private buildResponse(partial: Omit<HumanInteractionResponse, 'respondedAt'>): HumanInteractionResponse {
    return { ...partial, respondedAt: new Date().toISOString() };
  }

  private resolveResponder(turn: ConversationTurn): string | undefined {
    const firstName = turn.subscriber?.firstName?.trim();
    if (firstName) {
      return firstName;
    }

    const userName = turn.message?.author?.userName?.trim();
    if (userName) {
      return userName;
    }

    return turn.subscriber?.subscriberId ?? undefined;
  }

  private isAddressedHuman(turn: ConversationTurn, interaction: HumanInteractionEntity): boolean {
    const responder = turn.subscriber?.subscriberId;

    return Boolean(responder) && responder === interaction.subscriberId;
  }

  private async rejectForeignResponder(turn: ConversationTurn, interaction: HumanInteractionEntity): Promise<void> {
    this.logger.warn(
      {
        interactionIdentifier: interaction.identifier,
        environmentId: turn.config.environmentId,
        addressedTo: interaction.subscriberId,
        responder: turn.subscriber?.subscriberId,
        responderResolution: turn.subscriberResolution?.outcome,
      },
      'Human interaction response rejected — responder is not the addressed human'
    );

    await this.replyOnThread(
      turn,
      'This one is waiting on someone else — only the person it was sent to can answer it.'
    );
  }

  private async consumeNonPending(
    turn: ConversationTurn,
    current: HumanInteractionEntity
  ): Promise<HumanInboundResult> {
    await this.replyOnThread(turn, this.lateClickReply(current));

    if (current.status === HumanInteractionStatusEnum.EXPIRED) {
      return { outcome: 'settled', settled: current };
    }

    return { outcome: 'consumed' };
  }

  private lateClickReply(interaction: HumanInteractionEntity): string {
    switch (interaction.status) {
      case HumanInteractionStatusEnum.EXPIRED:
        return '⌛ This request has expired — the agent stopped waiting for it.';
      case HumanInteractionStatusEnum.CANCELED:
        return '🚫 This request was canceled by the agent.';
      default:
        return 'This request was already resolved.';
    }
  }

  private extractRepliedToMessageIds(turn: ConversationTurn): string[] {
    const message = turn.message;
    const raw = message?.raw as Record<string, unknown> | undefined;
    if (!raw) {
      return [];
    }

    if (turn.config.platform === AgentPlatformEnum.TELEGRAM) {
      const replyTo =
        (raw.reply_to_message as { message_id?: number | string } | undefined) ??
        ((raw.message as Record<string, unknown> | undefined)?.reply_to_message as
          | { message_id?: number | string }
          | undefined);

      if (replyTo?.message_id === undefined) {
        return [];
      }

      const bare = String(replyTo.message_id);
      const chatId = turn.platformThreadId?.split(':').pop();

      return chatId ? [`${chatId}:${bare}`, bare] : [bare];
    }

    if (turn.config.platform === AgentPlatformEnum.SLACK) {
      const event = (raw.event as Record<string, unknown> | undefined) ?? raw;
      const threadTs = event.thread_ts as string | undefined;

      if (!threadTs || threadTs === (event.ts as string | undefined)) {
        return [];
      }

      const channel = event.channel as string | undefined;

      return channel ? [threadTs, `${channel}:${threadTs}`] : [threadTs];
    }

    return [];
  }

  private async expireOverdue(interactions: HumanInteractionEntity[]): Promise<HumanInteractionEntity[]> {
    const results: HumanInteractionEntity[] = [];

    for (const interaction of interactions) {
      const current = await this.settlement.expireIfOverdue(interaction);
      if (current.status === HumanInteractionStatusEnum.PENDING) {
        results.push(current);
      }
    }

    return results;
  }

  private disambiguationCacheKey(conversationId: string): string {
    return `human:disamb:${conversationId}`;
  }

  private async replyOnThread(turn: ConversationTurn, markdown: string): Promise<void> {
    applyPlatformThreadIdToThread(turn.thread, turn.platformThreadId);
    await this.outboundGateway.replyOnThread(turn.thread, { markdown }, { failSoft: true });
  }
}
