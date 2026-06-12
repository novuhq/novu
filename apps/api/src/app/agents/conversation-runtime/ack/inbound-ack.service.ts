import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import type { WellKnownEmoji } from 'chat';
import type { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { type AgentPlatformEnum, PLATFORMS_WITH_TYPING_INDICATOR } from '../../shared/enums/agent-platform.enum';
import { OutboundGateway } from '../egress/outbound.gateway';

export const INBOUND_ACK_EMOJI = {
  /** Persistent processing signal for managed turns (active and queued). */
  queued: 'hourglass',
  /** Receipt signal for non-typing platforms (first message only). */
  receipt: 'eyes',
} as const satisfies Record<string, WellKnownEmoji>;

interface WorkingSignalParams {
  agentId: string;
  config: ResolvedAgentConfig;
  platformThreadId?: string;
  platformMessageId?: string;
  isFirstMessage?: boolean;
}

interface QueuedSignalParams {
  agentId: string;
  config: ResolvedAgentConfig;
  platformThreadId?: string;
  platformMessageId?: string;
}

interface ReplyDeliveredParams {
  agentId: string;
  config: ResolvedAgentConfig;
  platformThreadId?: string;
  firstPlatformMessageId?: string;
}

/** Identifiers needed to act on a turn from webhook metadata alone (no DB lookup). */
interface AckTarget {
  agentId: string;
  integrationIdentifier: string;
  platform: AgentPlatformEnum;
  platformThreadId: string;
  platformMessageId?: string;
  firstPlatformMessageId?: string;
}

/**
 * Owns every inbound liveness signal (typing indicator + reaction acks) for
 * both bridge and managed runtimes. Stateless and non-throwing: failures are
 * logged, never propagated, so an ack issue can't fail a turn.
 */
@Injectable()
export class InboundAckService {
  constructor(
    private readonly outboundGateway: OutboundGateway,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Active turn: typing platforms show the typing indicator; non-typing
   * platforms get an `eyes` reaction on the conversation's first message.
   * Used by bridge ingress and managed active dispatch.
   */
  async showWorkingSignal(params: WorkingSignalParams): Promise<void> {
    const { agentId, config, platformThreadId, platformMessageId, isFirstMessage } = params;

    if (!config.acknowledgeOnReceived || !platformThreadId) {
      return;
    }

    if (this.isTypingPlatform(config.platform)) {
      await this.guard(agentId, 'working-signal-typing', () =>
        this.outboundGateway.startTypingInConversation(agentId, config.integrationIdentifier, platformThreadId)
      );

      return;
    }

    if (!isFirstMessage || !platformMessageId) {
      return;
    }

    await this.guard(agentId, 'working-signal-receipt', () =>
      this.outboundGateway.reactToMessage(
        agentId,
        config.integrationIdentifier,
        config.platform,
        platformThreadId,
        platformMessageId,
        INBOUND_ACK_EMOJI.receipt
      )
    );
  }

  /** Managed turn: persistent `hourglass` on the user message (all platforms). */
  async showQueuedSignal(params: QueuedSignalParams): Promise<void> {
    const { agentId, config, platformThreadId, platformMessageId } = params;

    if (!config.acknowledgeOnReceived || !platformThreadId || !platformMessageId) {
      return;
    }

    await this.guard(agentId, 'queued-signal', () =>
      this.outboundGateway.reactToMessage(
        agentId,
        config.integrationIdentifier,
        config.platform,
        platformThreadId,
        platformMessageId,
        INBOUND_ACK_EMOJI.queued
      )
    );
  }

  /** Bridge reply delivered: clear the `eyes` receipt reaction (non-typing platforms only). */
  async onBridgeReplyDelivered(params: ReplyDeliveredParams): Promise<void> {
    const { agentId, config, platformThreadId, firstPlatformMessageId } = params;

    if (!config.acknowledgeOnReceived || !platformThreadId || !firstPlatformMessageId) {
      return;
    }

    if (this.isTypingPlatform(config.platform)) {
      return;
    }

    await this.guard(agentId, 'bridge-reply-clear', () =>
      this.outboundGateway.removeReaction(
        agentId,
        config.integrationIdentifier,
        config.platform,
        platformThreadId,
        firstPlatformMessageId,
        INBOUND_ACK_EMOJI.receipt
      )
    );
  }

  /**
   * Queued turn becomes active (queue-ready webhook). On typing platforms we
   * swap the `hourglass` for a live typing indicator. Non-typing platforms keep
   * the `hourglass` until completion, since there's no typing signal to show.
   */
  async onManagedQueueReady(metadata: Record<string, string>): Promise<void> {
    const target = this.resolveTarget(metadata);

    if (!target || !this.isTypingPlatform(target.platform)) {
      return;
    }

    const startedTyping = await this.guard(target.agentId, 'queue-ready-typing', () =>
      this.outboundGateway.startTypingInConversation(
        target.agentId,
        target.integrationIdentifier,
        target.platformThreadId
      )
    );

    if (startedTyping) {
      await this.clearReaction(target, target.platformMessageId, INBOUND_ACK_EMOJI.queued, 'queue-ready-clear');
    }
  }

  /**
   * Turn complete (reply, error, or requires-action): clear any reactions we set.
   * We can't tell from metadata whether the turn was queued or first-message, so
   * we clear best-effort; `eyes` is skipped on typing platforms where it's never set.
   */
  async onManagedTurnComplete(metadata: Record<string, string>): Promise<void> {
    const target = this.resolveTarget(metadata);

    if (!target) {
      return;
    }

    await this.clearReaction(target, target.platformMessageId, INBOUND_ACK_EMOJI.queued, 'turn-complete-queued');

    if (!this.isTypingPlatform(target.platform)) {
      await this.clearReaction(
        target,
        target.firstPlatformMessageId,
        INBOUND_ACK_EMOJI.receipt,
        'turn-complete-receipt'
      );
    }
  }

  private isTypingPlatform(platform: AgentPlatformEnum): boolean {
    return PLATFORMS_WITH_TYPING_INDICATOR.has(platform);
  }

  private async clearReaction(
    target: AckTarget,
    messageId: string | undefined,
    emoji: WellKnownEmoji,
    operation: string
  ): Promise<void> {
    if (!messageId) {
      return;
    }

    await this.guard(target.agentId, operation, () =>
      this.outboundGateway.removeReaction(
        target.agentId,
        target.integrationIdentifier,
        target.platform,
        target.platformThreadId,
        messageId,
        emoji
      )
    );
  }

  /**
   * Rebuild the action target from webhook metadata. Returns null when the
   * acks are disabled or required identifiers are absent (e.g. sessions started
   * before this metadata existed), in which case the caller no-ops.
   */
  private resolveTarget(metadata: Record<string, string>): AckTarget | null {
    const { agentId, integrationIdentifier, platform, platformThreadId, platformMessageId, firstPlatformMessageId } =
      metadata;

    if (metadata.acknowledgeOnReceived === 'false') {
      return null;
    }

    if (!agentId || !integrationIdentifier || !platform || !platformThreadId) {
      return null;
    }

    return {
      agentId,
      integrationIdentifier,
      platform: platform as AgentPlatformEnum,
      platformThreadId,
      platformMessageId: platformMessageId || undefined,
      firstPlatformMessageId: firstPlatformMessageId || undefined,
    };
  }

  /**
   * Run an outbound ack call without ever failing the turn. Acks are cosmetic
   * liveness signals, so failures are logged for NewRelic and otherwise ignored
   * (no Sentry — a missing typing indicator or reaction isn't an actionable issue).
   */
  private async guard(agentId: string, operation: string, fn: () => Promise<void>): Promise<boolean> {
    try {
      await fn();

      return true;
    } catch (err) {
      this.logger.warn(err, `[agent:${agentId}] inbound-ack ${operation} failed`);

      return false;
    }
  }
}
