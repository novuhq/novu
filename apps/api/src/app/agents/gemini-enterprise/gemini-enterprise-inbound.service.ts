import { randomUUID, timingSafeEqual } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import type { Request, Response } from 'express';
import { AgentConfigResolver, type ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { AgentSubscriberResolver } from '../conversation-runtime/conversation/agent-subscriber-resolver.service';
import { ChatInstanceRegistry } from '../conversation-runtime/ingress/chat-instance.registry';
import { type BridgeDispatchSlot, bridgeDispatchProbe } from '../conversation-runtime/runtime/bridge-dispatch-probe';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { captureAgentException } from '../shared/errors/capture-agent-sentry';
import { type GeInbound, type GeTurnInput, openTurn, parseInbound, step } from './a2a-mapping';
import { geThreadId } from './gemini-enterprise.adapter';
import { type GeBusEvent, GeminiEnterpriseTurnBus, geTurnBusKey } from './gemini-enterprise-turn-bus.service';

/** Gemini Enterprise drops a held stream at ~28 min; close first with a message the user can act on. */
const TURN_DEADLINE_MS = 25 * 60 * 1000;

export type JsonRpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: unknown };

@Injectable()
export class GeminiEnterpriseInboundService {
  constructor(
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly registry: ChatInstanceRegistry,
    private readonly turnBus: GeminiEnterpriseTurnBus,
    private readonly subscriberResolver: AgentSubscriberResolver,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /** 404 for every rejection (unknown agent, wrong provider, bad secret) so the URL leaks nothing. */
  async authorize(agentId: string, integrationIdentifier: string, secret: string): Promise<ResolvedAgentConfig> {
    const config = await this.agentConfigResolver.resolve(agentId, integrationIdentifier, {
      source: 'webhook_message',
    });
    const token = config.credentials.token;

    if (config.platform !== AgentPlatformEnum.GEMINI_ENTERPRISE || !token || !secretMatches(token, secret)) {
      throw new NotFoundException();
    }

    return config;
  }

  /**
   * Answers one A2A `message/stream` call. The reply is produced asynchronously (bridge → events ingest,
   * possibly on another pod), so the stream stays open and is fed from the thread's turn bus until the
   * turn's end signal, a newer turn on the same context, or the deadline.
   */
  async stream(config: ResolvedAgentConfig, rpc: JsonRpcRequest, req: Request, res: Response): Promise<void> {
    const inbound = parseInbound(rpc.params as Parameters<typeof parseInbound>[0]);
    const contextId = inbound.contextId ?? randomUUID();
    const threadId = geThreadId(contextId);
    const busKey = geTurnBusKey(config.environmentId, config.integrationIdentifier, threadId);
    const streamId = randomUUID();
    const abort = new AbortController();
    let turn = openTurn({ taskId: randomUUID(), contextId });

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.flushHeaders();

    const deadline = setTimeout(() => apply({ type: 'deadline' }), TURN_DEADLINE_MS);
    const finish = () => {
      clearTimeout(deadline);
      abort.abort();
      if (!res.writableEnded) res.end();
    };
    const apply = (input: GeTurnInput) => {
      if (res.writableEnded) return;
      const result = step(turn, input);
      turn = result.turn;
      for (const event of result.events) {
        res.write(`data: ${JSON.stringify({ jsonrpc: '2.0', id: rpc.id ?? null, result: event })}\n\n`);
      }
      if (result.close) finish();
    };
    res.on('close', finish);

    apply({ type: 'start' });

    const slot: BridgeDispatchSlot = {
      deliveryIds: [],
      onFailed: (deliveryId) => this.publishEnd(busKey, deliveryId),
    };

    try {
      // Our own supersede notice is the read cursor: older streams on this context close, and this
      // stream sees exactly what is published after it.
      const cursor = await this.turnBus.publish(busKey, { type: 'superseded', streamId });
      const keepAlive = () => {
        if (!res.writableEnded) res.write(': keep-alive\n\n');
      };
      // Handled now: dispatch awaits before `reading` does, and an unhandled rejection exits the process.
      const reading = this.consume(busKey, cursor, streamId, slot, abort.signal, apply, keepAlive).catch((err) => {
        this.logger.error(err, `[agent:${config.agentId}] Gemini Enterprise turn bus read failed`);
        apply({ type: 'end' });
      });

      await this.dispatch(config, threadId, contextId, inbound, slot);

      if (slot.deliveryIds.length === 0) {
        // Nothing reached a bridge (plan limit, no bridge URL, dropped duplicate): end after what was posted.
        const localTurnId = `local:${streamId}`;
        slot.deliveryIds.push(localTurnId);
        await this.publishEnd(busKey, localTurnId);
      }

      await reading;
    } catch (err) {
      this.logger.error(err, `[agent:${config.agentId}] Gemini Enterprise turn failed`);
      captureAgentException(err, {
        component: 'gemini-enterprise-inbound',
        operation: 'stream',
        agentId: config.agentId,
      });
      apply({ type: 'end' });
    }
  }

  private async consume(
    busKey: string,
    cursor: string,
    streamId: string,
    slot: BridgeDispatchSlot,
    signal: AbortSignal,
    apply: (input: GeTurnInput) => void,
    keepAlive: () => void
  ): Promise<void> {
    for await (const batch of this.turnBus.read(busKey, cursor, signal)) {
      if (batch.length === 0) {
        keepAlive();
      }

      for (const { event } of batch) {
        const input = toTurnInput(event, streamId, slot.deliveryIds);
        if (input) apply(input);

        if (signal.aborted) return;
      }
    }
  }

  private async dispatch(
    config: ResolvedAgentConfig,
    threadId: string,
    contextId: string,
    inbound: GeInbound,
    slot: BridgeDispatchSlot
  ): Promise<void> {
    const chat = await this.registry.getOrCreate(
      `${config.agentId}:${config.integrationIdentifier}`,
      config.agentId,
      config.platform,
      config
    );
    const adapter = chat.getAdapter('gemini_enterprise');
    const subscriberId = await this.subscriberResolver.provisionGeminiEnterpriseSubscriber({
      environmentId: config.environmentId,
      organizationId: config.organizationId,
      integrationIdentifier: config.integrationIdentifier,
      agentIdentifier: config.agentIdentifier,
      contextId,
    });
    const user = { userId: subscriberId, userName: subscriberId, fullName: subscriberId, isBot: false, isMe: false };

    await bridgeDispatchProbe.run(slot, async () => {
      if (inbound.kind === 'action') {
        await chat.processAction(
          {
            adapter,
            actionId: inbound.action.id,
            value: inbound.action.value,
            messageId: inbound.action.sourceMessageId ?? '',
            threadId,
            user,
            raw: inbound,
          },
          undefined
        );

        return;
      }

      const message = adapter.parseMessage({
        id: inbound.messageId ?? randomUUID(),
        text: inbound.text,
        subscriberId,
      });
      await chat.processMessage(adapter, threadId, message);
    });
  }

  private async publishEnd(busKey: string, turnId: string): Promise<void> {
    try {
      await this.turnBus.publish(busKey, { type: 'end', turnId });
    } catch (err) {
      this.logger.warn(err, 'Failed to publish Gemini Enterprise end of turn');
    }
  }
}

/** Our own supersede notice and other turns' end signals are not meant for this stream. */
function toTurnInput(event: GeBusEvent, streamId: string, deliveryIds: string[]): GeTurnInput | undefined {
  if (event.type === 'superseded') return event.streamId === streamId ? undefined : { type: 'superseded' };
  if (event.type === 'end') return deliveryIds.includes(event.turnId) ? { type: 'end' } : undefined;

  return event;
}

function secretMatches(expected: string, actual: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(actual);

  return a.length === b.length && timingSafeEqual(a, b);
}
