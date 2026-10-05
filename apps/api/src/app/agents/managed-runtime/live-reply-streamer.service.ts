import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { type ConversationTarget, OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import type { AgentEventContext } from '../shared/agent-event-sink.service';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { ManagedAgentProviderFactory } from './managed-agent-provider-factory.service';

/** Teams buffers posts made outside an inbound turn, so it would show no preview. */
const STREAMING_PLATFORMS = new Set<string>([AgentPlatformEnum.SLACK, AgentPlatformEnum.TELEGRAM]);

/** Delivers a reply through the normal reply path; with a preview id it edits the preview. */
export type DeliverStreamedReply = (text: string, previewMessageId?: string) => Promise<unknown>;

/**
 * Streams a managed agent reply into its channel while the model writes it.
 *
 * The observer's `/live` stream yields preview text and returns the final `agent.message` text.
 * This reader then delivers the reply, and the reply's `message` webhook (marked `streamed`) is
 * skipped. With no final text the preview is deleted; the webhook delivers any message that comes.
 */
@Injectable()
export class LiveReplyStreamer implements OnApplicationShutdown {
  private readonly shutdown = new AbortController();
  private readonly running = new Set<Promise<void>>();

  constructor(
    private readonly providerFactory: ManagedAgentProviderFactory,
    private readonly conversationService: AgentConversationService,
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
    const first = await live.next();
    if (first.done) {
      // Nothing to preview, but a reply that completed before its first text is ours to deliver.
      if (first.value !== undefined) await deliver(first.value);

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
    const reply: { text?: string; error?: unknown } = {};
    const firstChunk = first.value;

    async function* preview(): AsyncIterable<string> {
      yield firstChunk;
      try {
        reply.text = yield* live;
      } catch (err) {
        // Ending instead of throwing lets the chat SDK return the preview's message id.
        reply.error = err;
      }
    }

    let previewMessageId: string | undefined;
    try {
      previewMessageId = (await this.outboundGateway.streamPreview(target, preview())).messageId;
    } catch (err) {
      this.logger.warn({ err, messageId }, 'Streaming a reply preview failed; delivering it when it completes');
      reply.text ??= await drainLive(live).catch((liveErr) => {
        reply.error = liveErr;

        return undefined;
      });
    }

    if (reply.text !== undefined) {
      await deliver(reply.text, previewMessageId);

      return;
    }

    if (previewMessageId) {
      await this.outboundGateway.deleteInConversation(
        target.agentId,
        target.integrationIdentifier,
        target.platformThreadId,
        previewMessageId,
        target.workspaceId
      );
    }

    if (reply.error) {
      throw reply.error;
    }
  }
}

/** Reads the rest of a live stream for its final text. */
async function drainLive(live: AsyncGenerator<string, string | undefined>): Promise<string | undefined> {
  for (;;) {
    const next = await live.next();
    if (next.done) return next.value;
  }
}
