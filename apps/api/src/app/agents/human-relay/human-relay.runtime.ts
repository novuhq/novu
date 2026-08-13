import { Injectable } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionResponse, HumanInteractionStatusEnum } from '@novu/shared';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import type { AgentRuntime } from '../conversation-runtime/runtime/agent-runtime.port';
import type { ConversationTurn } from '../conversation-runtime/runtime/conversation-turn';
import { applyPlatformThreadIdToThread } from '../conversation-runtime/runtime/platform-thread.util';
import { AgentEventEnum } from '../shared/enums/agent-event.enum';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { parseHumanActionId } from './human-action-id';
import { buildDisambiguationCard } from './human-card.builder';
import { HumanInteractionSettlementService } from './human-interaction-settlement.service';

const DISAMBIGUATION_CACHE_TTL_SECONDS = 10 * 60;

/**
 * The "no brain" runtime behind `runtime: 'human_relay'` agents. Inbound
 * events on the relay's channels never reach a bridge or a managed agent —
 * they resolve pending human interactions created via `/v1/human/interactions`:
 *
 * - Button clicks (`human:*` action ids) settle approve/choose interactions.
 * - Freeform replies settle `ask` interactions, correlated by platform
 *   reply-to first, then by "single pending ask", with an explicit
 *   disambiguation card when several are pending.
 */
@Injectable()
export class HumanRelayRuntime implements AgentRuntime {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly settlement: HumanInteractionSettlementService,
    private readonly outboundGateway: OutboundGateway,
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async dispatch(turn: ConversationTurn): Promise<void> {
    if (turn.event === AgentEventEnum.ON_ACTION) {
      await this.handleAction(turn);

      return;
    }

    if (turn.event === AgentEventEnum.ON_MESSAGE) {
      await this.handleMessage(turn);
    }

    // Reactions are ignored in v1.
  }

  private async handleAction(turn: ConversationTurn): Promise<void> {
    const parsed = parseHumanActionId(turn.action?.id);
    if (!parsed) {
      return;
    }

    const environmentId = turn.config.environmentId;
    const interaction = await this.humanInteractionRepository.findByIdentifier(environmentId, parsed.identifier);

    if (!interaction) {
      this.logger.warn(
        { actionId: turn.action?.id, environmentId },
        'Human action click referenced an unknown interaction'
      );

      return;
    }

    if (!this.isAddressedHuman(turn, interaction)) {
      await this.rejectForeignResponder(turn, interaction);

      return;
    }

    if (parsed.type === 'disambiguation-pick') {
      await this.handleDisambiguationPick(turn, interaction);

      return;
    }

    const current = await this.settlement.expireIfOverdue(interaction);
    if (current.status !== HumanInteractionStatusEnum.PENDING) {
      await this.replyOnThread(turn, this.lateClickReply(current));

      return;
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

        return;
      }

      settled = await this.settlement.settle(
        current,
        HumanInteractionStatusEnum.ANSWERED,
        this.buildResponse({ type: 'option', optionId: parsed.optionId, respondedBy })
      );
    }

    if (!settled) {
      // Lost the race to another click/expiry — the winner already edited the card.
      const latest = await this.humanInteractionRepository.findByIdentifier(environmentId, parsed.identifier);
      if (latest && latest.status !== HumanInteractionStatusEnum.PENDING) {
        await this.replyOnThread(turn, this.lateClickReply(latest));
      }
    }
  }

  private async handleMessage(turn: ConversationTurn): Promise<void> {
    const text = turn.message?.text?.trim();
    if (!text) {
      return;
    }

    const environmentId = turn.config.environmentId;

    // 1. Exact correlation: the human used the platform's reply-to/thread on the question message.
    const repliedTo = this.extractRepliedToMessageIds(turn);
    if (repliedTo.length > 0) {
      const exact = await this.humanInteractionRepository.findPendingByPlatformMessageId(environmentId, repliedTo);
      if (exact) {
        await this.settleAskWithText(exact, text, turn);

        return;
      }
    }

    // 2. Bare message: correlate against pending asks for this human.
    const subscriberId = turn.subscriber?.subscriberId;
    if (!subscriberId) {
      return;
    }

    const pendingAsks = await this.expireOverdue(
      await this.humanInteractionRepository.findPendingAsks(environmentId, subscriberId)
    );

    if (pendingAsks.length === 0) {
      await this.replyOnThread(turn, 'Nothing is waiting for your reply right now.');

      return;
    }

    if (pendingAsks.length === 1) {
      await this.settleAskWithText(pendingAsks[0], text, turn);

      return;
    }

    // 3. Several pending: cache the reply text and ask which question it answers.
    await this.cacheService.set(
      this.disambiguationCacheKey(turn.conversation._id),
      JSON.stringify({ text }),
      { ttl: DISAMBIGUATION_CACHE_TTL_SECONDS }
    );

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
  }

  private async handleDisambiguationPick(turn: ConversationTurn, interaction: HumanInteractionEntity): Promise<void> {
    const cacheKey = this.disambiguationCacheKey(turn.conversation._id);
    const cached = await this.cacheService.get(cacheKey);

    if (!cached) {
      await this.replyOnThread(
        turn,
        'I lost track of that reply — please answer again by replying directly to the question message.'
      );

      return;
    }

    const { text } = JSON.parse(cached) as { text: string };
    await this.cacheService.del(cacheKey);

    const current = await this.settlement.expireIfOverdue(interaction);
    if (current.status !== HumanInteractionStatusEnum.PENDING) {
      await this.replyOnThread(turn, this.lateClickReply(current));

      return;
    }

    await this.settleAskWithText(current, text, turn);
  }

  private async settleAskWithText(
    interaction: HumanInteractionEntity,
    text: string,
    turn: ConversationTurn
  ): Promise<void> {
    if (!this.isAddressedHuman(turn, interaction)) {
      await this.rejectForeignResponder(turn, interaction);

      return;
    }

    const current = await this.settlement.expireIfOverdue(interaction);
    if (current.status !== HumanInteractionStatusEnum.PENDING) {
      await this.replyOnThread(turn, this.lateClickReply(current));

      return;
    }

    const settled = await this.settlement.settle(
      current,
      HumanInteractionStatusEnum.ANSWERED,
      this.buildResponse({ type: 'text', text, respondedBy: this.resolveResponder(turn) })
    );

    if (settled) {
      await this.replyOnThread(turn, '✅ Got it — passed along.');
    }
  }

  private buildResponse(partial: Omit<HumanInteractionResponse, 'respondedAt'>): HumanInteractionResponse {
    return { ...partial, respondedAt: new Date().toISOString() };
  }

  private resolveResponder(turn: ConversationTurn): string | undefined {
    return turn.subscriber?.subscriberId ?? turn.message?.author?.userName ?? undefined;
  }

  /**
   * An interaction is addressed to exactly one human, and the whole point of
   * the product is that *that* human answered. Delivery can land on a shared
   * surface (a Slack channel endpoint, a Telegram group), where every member
   * sees the same buttons and can reply in the same thread — so the responder's
   * resolved subscriber must match the addressee before anything settles.
   * Unidentifiable senders fail closed: an actor we cannot name can never carry
   * an approval.
   */
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

  /**
   * Platform-native reply-to extraction from the raw payload escape hatch,
   * returned as every id shape the delivery may have stamped. Telegram
   * webhooks carry a bare `reply_to_message.message_id`, while the adapter's
   * post result (what we stored) is a `chatId:messageId` composite.
   */
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
      // platformThreadId is `telegram:<chatId>` — the composite is `<chatId>:<messageId>`.
      const chatId = turn.platformThreadId?.split(':').pop();

      return chatId ? [`${chatId}:${bare}`, bare] : [bare];
    }

    if (turn.config.platform === AgentPlatformEnum.SLACK) {
      const event = (raw.event as Record<string, unknown> | undefined) ?? raw;
      const threadTs = event.thread_ts as string | undefined;

      // A top-level (non-threaded) message has no thread_ts; a threaded reply's
      // thread_ts is the parent message ts — i.e. the delivered card.
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
