import { setTimeout as delay } from 'node:timers/promises';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { ConversationActivationService } from '../conversation-runtime/conversation/conversation-activation.service';
import { type ConversationTarget, OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import type { AgentEventContext } from '../shared/agent-event-sink.service';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { ManagedAgentProviderFactory } from './managed-agent-provider-factory.service';

/** Teams buffers posts made outside an inbound turn, so it would show no preview. */
const STREAMING_PLATFORMS = new Set<AgentPlatformEnum>([AgentPlatformEnum.SLACK, AgentPlatformEnum.TELEGRAM]);

/** How long a streamed `message` webhook waits for its live reader to deliver the reply. */
const READER_DELIVERY_TIMEOUT_MS = 10_000;
const READER_DELIVERY_POLL_MS = 500;

/** Delivers a reply through the normal reply path; with a preview id it edits the preview. */
export type DeliverStreamedReply = (text: string, previewMessageId?: string) => Promise<unknown>;

/**
 * Streams a managed agent reply into its channel while the model writes it.
 *
 * The observer's `/live` stream yields preview text and settles the final `agent.message` text.
 * This reader then delivers the reply by editing the preview. The reply's `message` webhook
 * (marked `streamed`) waits for that and delivers the reply itself if the reader did not; the
 * activity claim on the Anthropic message id lets only one of them deliver.
 */
@Injectable()
export class LiveReplyStreamer implements OnApplicationShutdown {
  private readonly shutdown = new AbortController();
  private readonly running = new Set<Promise<void>>();

  constructor(
    private readonly providerFactory: ManagedAgentProviderFactory,
    private readonly conversationService: AgentConversationService,
    private readonly conversationActivation: ConversationActivationService,
    private readonly outboundGateway: OutboundGateway,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  start(context: AgentEventContext, messageId: string, deliver: DeliverStreamedReply): void {
    const run = this.stream(context, messageId, deliver).catch((err) => {
      this.logger.warn({ err, messageId, sessionId: context.sessionId }, 'Streaming a reply failed');
    });
    this.running.add(run);
    void run.finally(() => this.running.delete(run));
  }

  /** Waits until the reply's live reader delivered it, or gives up so the caller delivers it. */
  async waitForDelivery(context: AgentEventContext, messageId: string): Promise<void> {
    for (let waited = 0; waited < READER_DELIVERY_TIMEOUT_MS; waited += READER_DELIVERY_POLL_MS) {
      const delivered = await this.conversationService.findAgentMessageByIdentifier(
        context.environmentId,
        context.conversationId,
        messageId
      );
      if (delivered) return;
      await delay(READER_DELIVERY_POLL_MS);
    }
  }

  /** Ends open streams so their cleanup runs before the process exits. */
  async onApplicationShutdown(): Promise<void> {
    this.shutdown.abort();
    await Promise.allSettled(this.running);
  }

  private async stream(context: AgentEventContext, messageId: string, deliver: DeliverStreamedReply): Promise<void> {
    const { sessionId, environmentId, organizationId, conversationId } = context;
    if (!sessionId || context.suppressReply || !context.platform || !STREAMING_PLATFORMS.has(context.platform)) {
      return;
    }

    const conversation = await this.conversationService.getConversation(conversationId, environmentId, organizationId);
    if (!conversation) {
      return;
    }

    const live = this.providerFactory.getObserver().live(sessionId, messageId, { signal: this.shutdown.signal });
    const chunks = live[Symbol.asyncIterator]();
    const first = await chunks.next();
    if (first.done) {
      // Nothing to preview, but a reply that completed before its first text is ours to deliver.
      const text = await live.final.catch(() => undefined);
      if (text !== undefined) await deliver(text);

      return;
    }

    const channel = this.conversationService.getPrimaryChannel(conversation);
    const target: ConversationTarget = {
      agentId: conversation._agentId,
      integrationIdentifier: context.integrationIdentifier,
      platform: channel.platform,
      platformThreadId: channel.platformThreadId,
      workspaceId: channel.workspace?.id,
    };

    let previewMessageId: string;
    try {
      // The preview is posted before the reply path runs, so it checks the outbound limit first.
      await this.conversationActivation.assertOutboundWithinLimit({
        conversation,
        platform: context.platform,
        organizationId,
      });
      ({ messageId: previewMessageId } = await this.outboundGateway.streamPreview(
        target,
        withFirst(first.value, chunks)
      ));
    } catch (err) {
      // Without a preview the `message` webhook delivers the reply.
      await chunks.return?.();
      throw err;
    }

    try {
      const text = await live.final.catch(() => undefined);
      if (text !== undefined) await deliver(text, previewMessageId);
    } finally {
      await this.deletePreviewUnlessDelivered(context, target, messageId, previewMessageId);
    }
  }

  private async deletePreviewUnlessDelivered(
    context: AgentEventContext,
    target: ConversationTarget,
    messageId: string,
    previewMessageId: string
  ): Promise<void> {
    const delivered = await this.conversationService.findAgentMessageByIdentifier(
      context.environmentId,
      context.conversationId,
      messageId
    );
    if (delivered?.platformMessageId === previewMessageId) {
      return;
    }

    await this.outboundGateway
      .deleteInConversation(
        target.agentId,
        target.integrationIdentifier,
        target.platformThreadId,
        previewMessageId,
        target.workspaceId
      )
      .catch((err) => this.logger.warn({ err, previewMessageId }, 'Failed to delete a reply preview'));
  }
}

async function* withFirst(first: string, rest: AsyncIterator<string>): AsyncIterable<string> {
  yield first;
  yield* { [Symbol.asyncIterator]: () => rest };
}
