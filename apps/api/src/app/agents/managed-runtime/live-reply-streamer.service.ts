import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { type ConversationTarget, OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import type { AgentEventContext } from '../shared/agent-event-sink.service';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { ManagedAgentProviderFactory } from './managed-agent-provider-factory.service';

/**
 * Platforms where a server-initiated post streams into one message. Teams buffers posts made
 * outside an inbound turn, so it would show no preview.
 */
const PREVIEW_PLATFORMS = new Set<string>([AgentPlatformEnum.SLACK, AgentPlatformEnum.TELEGRAM]);

/** Delivers a reply's final text by replacing the preview message. */
export type DeliverStreamedReply = (text: string, previewMessageId: string) => Promise<unknown>;

/**
 * Shows a managed agent reply in its channel while the model writes it.
 *
 * The streamed text is only a preview: provider deltas are best effort. When the reply
 * completes, `deliver` sends its `agent.message` text through the normal reply path, which
 * edits the preview in place. A preview that did not become the delivered reply (no final
 * text, failed delivery, or the `message` webhook delivered first) is deleted.
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
      this.logger.warn({ err, messageId, sessionId: context.sessionId }, 'Live reply preview failed');
    });
    this.running.add(run);
    void run.finally(() => this.running.delete(run));
  }

  /** Ends open previews so their cleanup runs before the process exits. */
  async onApplicationShutdown(): Promise<void> {
    this.shutdown.abort();
    await Promise.allSettled(this.running);
  }

  private async stream(context: AgentEventContext, messageId: string, deliver: DeliverStreamedReply): Promise<void> {
    const { sessionId, environmentId, organizationId, conversationId } = context;
    if (!sessionId || context.suppressReply || !context.platform || !PREVIEW_PLATFORMS.has(context.platform)) {
      return;
    }

    const conversation = await this.conversationService.getConversation(conversationId, environmentId, organizationId);
    if (!conversation) {
      return;
    }

    const live = this.providerFactory.getObserver().live(sessionId, messageId, { signal: this.shutdown.signal });
    // Nothing to preview: the reply is unknown, already finished, or has another reader.
    const first = await live.next();
    if (first.done) {
      return;
    }
    const firstChunk = first.value;

    const channel = this.conversationService.getPrimaryChannel(conversation);
    const target: ConversationTarget = {
      agentId: conversation._agentId,
      integrationIdentifier: context.integrationIdentifier,
      platform: channel.platform,
      platformThreadId: channel.platformThreadId,
      workspaceId: channel.workspace?.id,
    };
    const reply: { text?: string; error?: unknown } = {};

    async function* preview(): AsyncIterable<string> {
      yield firstChunk;
      try {
        for (let next = await live.next(); ; next = await live.next()) {
          if (next.done) {
            reply.text = next.value;

            return;
          }
          yield next.value;
        }
      } catch (err) {
        // Ending instead of throwing lets the chat SDK return the preview's message id.
        reply.error = err;
      }
    }

    const sent = await this.outboundGateway.streamPreview(target, preview());
    try {
      if (reply.text !== undefined) {
        await deliver(reply.text, sent.messageId);
      }
    } finally {
      await this.deleteUnlessDelivered(context, target, messageId, sent.messageId);
    }

    if (reply.error) {
      throw reply.error;
    }
  }

  private async deleteUnlessDelivered(
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

    await this.outboundGateway.deleteInConversation(
      target.agentId,
      target.integrationIdentifier,
      target.platformThreadId,
      previewMessageId,
      target.workspaceId
    );
  }
}
