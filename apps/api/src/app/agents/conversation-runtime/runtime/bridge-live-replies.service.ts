import type { Readable } from 'node:stream';
import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { type AgentEventEnvelope, isAgentEventEnvelope } from '@novu/agent-event-protocol';
import { PinoLogger } from '@novu/application-generic';
import type { ConversationEntity } from '@novu/dal';
import type { LiveReply } from '@novu/thalamus/durable';
import { createParser } from 'eventsource-parser';
import { ResolvedAgentConfig } from '../../channels/agent-config-resolver.service';
import { streamsLiveReplies } from '../../managed-runtime/live-reply-streamer.service';
import { type AgentEventContext, AgentEventSink } from '../../shared/agent-event-sink.service';
import { resolveLifecycleChannel } from '../conversation/run-lifecycle-activity';

/** A bridge controls this stream, so neither a frame nor the replies it opens may grow without bound. */
const MAX_FRAME_CHARS = 1024 * 1024;
const MAX_OPEN_REPLIES = 8;
const MAX_QUEUED_CHARS = 1024 * 1024;

/** Streams the replies a bridge writes to its SSE response into the conversation's channel. */
@Injectable()
export class BridgeLiveReplies implements OnApplicationShutdown {
  private readonly bodies = new Set<Readable>();

  constructor(
    private readonly agentEventSink: AgentEventSink,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** Closing a body ends its open replies, so their streams finish before the process exits. */
  onApplicationShutdown(): void {
    for (const body of this.bodies) body.destroy();
  }

  /** Set only when the channel streams; the bridge is then asked for SSE and its body handed to the reader. */
  readerFor(
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    platformThreadId?: string
  ): ((body: Readable) => void) | undefined {
    if (!streamsLiveReplies(config.platform)) {
      return undefined;
    }

    return (body) => {
      this.bodies.add(body);
      body.once('close', () => this.bodies.delete(body));
      this.read(body, config, conversation, platformThreadId).catch((err) => {
        body.destroy();
        this.logger.warn(err, `[agent:${config.agentIdentifier}] Bridge live reply stream ended early`);
      });
    };
  }

  private async read(
    body: Readable,
    config: ResolvedAgentConfig,
    conversation: ConversationEntity,
    platformThreadId?: string
  ): Promise<void> {
    const channel = resolveLifecycleChannel(conversation, platformThreadId);
    const context: AgentEventContext = {
      userId: config.organizationId,
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      conversationId: String(conversation._id),
      agentIdentifier: config.agentIdentifier,
      integrationIdentifier: config.integrationIdentifier,
      agentId: config.agentId,
      platform: config.platform,
      platformThreadId: channel.platformThreadId,
      channel,
      source: 'bridge',
    };

    await readBridgeLiveReplies(
      body,
      (envelope) => envelope.conversationId === context.conversationId && envelope.agentId === config.agentIdentifier,
      (runId, messageId, reply) => this.agentEventSink.startLiveReply(context, runId, messageId, () => reply)
    );
  }
}

/** Text of one reply a bridge is writing to its SSE response. */
class BridgeLiveReply implements LiveReply {
  readonly final: Promise<string | undefined>;
  private settleFinal: (text: string | undefined) => void = () => {};
  private readonly pending: string[] = [];
  private queuedChars = 0;
  private ended = false;
  private wake?: () => void;

  constructor() {
    this.final = new Promise((resolve) => {
      this.settleFinal = resolve;
    });
  }

  push(delta: string): void {
    this.queuedChars += delta.length;
    if (this.queuedChars > MAX_QUEUED_CHARS) throw new Error('Bridge live reply is not being read');
    this.pending.push(delta);
    this.wakeReader();
  }

  end(text?: string): void {
    if (this.ended) return;
    this.ended = true;
    this.settleFinal(text);
    this.wakeReader();
  }

  async *[Symbol.asyncIterator](): AsyncIterator<string> {
    while (true) {
      const delta = this.pending.shift();
      if (delta !== undefined) {
        this.queuedChars -= delta.length;
        yield delta;
        continue;
      }
      if (this.ended) return;
      await new Promise<void>((resolve) => {
        this.wake = resolve;
      });
    }
  }

  private wakeReader(): void {
    const wake = this.wake;
    this.wake = undefined;
    wake?.();
  }
}

/**
 * Reads a bridge's SSE response. Each `message-start` opens a reply handed to `onReply`, its
 * `message-delta`s feed it and `message-end` settles its final text. Replies still open when the
 * response ends settle without text, so their durable `message` delivers them instead.
 */
async function readBridgeLiveReplies(
  body: Readable,
  accepts: (envelope: AgentEventEnvelope) => boolean,
  onReply: (runId: string, messageId: string, reply: LiveReply) => void
): Promise<void> {
  const open = new Map<string, BridgeLiveReply>();

  try {
    for await (const data of sseData(body)) {
      const envelope = parseEnvelope(data);
      if (envelope && accepts(envelope)) applyEnvelope(open, envelope, onReply);
    }
  } finally {
    for (const reply of open.values()) reply.end();
  }
}

function applyEnvelope(
  open: Map<string, BridgeLiveReply>,
  { runId, event }: AgentEventEnvelope,
  onReply: (runId: string, messageId: string, reply: LiveReply) => void
): void {
  if (event.type === 'message-start') {
    if (open.has(event.messageId)) return;
    if (open.size >= MAX_OPEN_REPLIES) throw new Error('Bridge opened too many live replies');
    const reply = new BridgeLiveReply();
    open.set(event.messageId, reply);
    onReply(runId, event.messageId, reply);
  } else if (event.type === 'message-delta') {
    open.get(event.messageId)?.push(event.delta);
  } else if (event.type === 'message-end') {
    open.get(event.messageId)?.end(event.content && 'markdown' in event.content ? event.content.markdown : undefined);
    open.delete(event.messageId);
  }
}

async function* sseData(body: Readable): AsyncIterable<string> {
  const decoder = new TextDecoder();
  const frames: string[] = [];
  const parser = createParser({
    maxBufferSize: MAX_FRAME_CHARS,
    onEvent: (event) => frames.push(event.data),
    onError: (error) => {
      if (error.type === 'max-buffer-size-exceeded') throw error;
    },
  });

  for await (const chunk of body) {
    parser.feed(typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true }));
    yield* frames.splice(0);
  }
}

function parseEnvelope(data: string): AgentEventEnvelope | undefined {
  try {
    const parsed = JSON.parse(data);

    return isAgentEventEnvelope(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}
