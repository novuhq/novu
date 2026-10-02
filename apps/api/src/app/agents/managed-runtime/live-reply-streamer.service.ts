import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentRepository } from '@novu/dal';
import { AgentConversationService } from '../conversation-runtime/conversation/agent-conversation.service';
import { OutboundGateway } from '../conversation-runtime/egress/outbound.gateway';
import type { AgentEventContext } from '../shared/agent-event-sink.service';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { ManagedAgentProviderFactory } from './managed-agent-provider-factory.service';

/** Platforms that edit a posted message in place, so a streamed reply stays one message. */
const STREAMING_PLATFORMS = new Set<string>([
  AgentPlatformEnum.SLACK,
  AgentPlatformEnum.TEAMS,
  AgentPlatformEnum.TELEGRAM,
]);

/**
 * Streams a managed agent reply into its channel while the model writes it.
 *
 * The reply's message activity, keyed by the provider message id, is the claim: the durable
 * `message` webhook finds it and skips posting, like a redelivered webhook. A stream that
 * fails releases the claim so the webhook posts the reply instead.
 */
@Injectable()
export class LiveReplyStreamer {
  constructor(
    private readonly providerFactory: ManagedAgentProviderFactory,
    private readonly conversationService: AgentConversationService,
    private readonly agentRepository: AgentRepository,
    private readonly outboundGateway: OutboundGateway,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  start(context: AgentEventContext, messageId: string): void {
    const abort = new AbortController();

    this.stream(context, messageId, abort.signal)
      .catch((err) => {
        this.logger.warn({ err, messageId, sessionId: context.sessionId }, 'Live reply stream failed');
      })
      .finally(() => abort.abort());
  }

  private async stream(context: AgentEventContext, messageId: string, signal: AbortSignal): Promise<void> {
    const { sessionId, environmentId, organizationId, conversationId } = context;
    if (!sessionId || context.suppressReply || !context.platform || !STREAMING_PLATFORMS.has(context.platform)) {
      return;
    }

    const conversation = await this.conversationService.getConversation(conversationId, environmentId, organizationId);
    if (!conversation) {
      return;
    }

    const chunks = this.providerFactory.getObserver().live(sessionId, messageId, { signal })[Symbol.asyncIterator]();
    // Nothing to show: another reader owns this reply, or it already finished.
    const first = await chunks.next();
    if (first.done) {
      return;
    }

    const channel = this.conversationService.getPrimaryChannel(conversation);
    const agent = await this.agentRepository.findOne({ _id: conversation._agentId, _environmentId: environmentId }, [
      'name',
    ]);
    const { activity, created } = await this.conversationService.persistAgentMessage({
      conversationId,
      channel,
      agentIdentifier: context.agentIdentifier,
      agentName: agent?.name,
      identifier: messageId,
      content: '',
      environmentId,
      organizationId,
    });
    if (!created) {
      return;
    }

    const release = () =>
      this.conversationService.deleteAgentMessage({
        environmentId,
        organizationId,
        conversationId,
        activityId: activity._id,
      });
    const reply: { text: string; error?: unknown } = { text: '' };

    async function* relay(): AsyncIterable<string> {
      reply.text = first.value;
      yield first.value;
      try {
        for (let next = await chunks.next(); !next.done; next = await chunks.next()) {
          reply.text += next.value;
          yield next.value;
        }
      } catch (err) {
        reply.error = err;
      }
    }

    const target = {
      agentId: conversation._agentId,
      integrationIdentifier: context.integrationIdentifier,
      platform: channel.platform,
      platformThreadId: channel.platformThreadId,
      workspaceId: channel.workspace?.id,
    };

    let sent: Awaited<ReturnType<OutboundGateway['streamToConversation']>>;
    try {
      sent = await this.outboundGateway.streamToConversation(target, relay());
    } catch (err) {
      await release();
      throw err;
    }

    if (reply.error) {
      // The post holds a cut-off reply; remove it so the webhook posts the full one.
      await this.outboundGateway
        .deleteInConversation(
          target.agentId,
          target.integrationIdentifier,
          target.platformThreadId,
          sent.messageId,
          target.workspaceId
        )
        .catch((err) => this.logger.warn({ err, messageId }, 'Failed to delete cut-off live reply'));
      await release();
      throw reply.error;
    }

    await this.conversationService.completeAgentMessage({
      environmentId,
      organizationId,
      conversationId,
      activityId: activity._id,
      platformMessageId: sent.messageId,
      content: reply.text,
    });
  }
}
