import { randomUUID, timingSafeEqual } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  PinoLogger,
} from '@novu/application-generic';
import { SubscriberRepository } from '@novu/dal';
import { AGENT_PLATFORM_PROVISION_SOURCE, AGENT_PROVISION_DATA_KEYS } from '@novu/shared';
import type { Request, Response } from 'express';
import { AgentConfigResolver, type ResolvedAgentConfig } from '../channels/agent-config-resolver.service';
import { buildPlatformSubscriberId } from '../conversation-runtime/conversation/agent-subscriber-resolver.service';
import { ChatInstanceRegistry } from '../conversation-runtime/ingress/chat-instance.registry';
import { type BridgeDispatchSlot, bridgeDispatchProbe } from '../conversation-runtime/runtime/bridge-dispatch-probe';
import { AgentPlatformEnum } from '../shared/enums/agent-platform.enum';
import { captureAgentException } from '../shared/errors/capture-agent-sentry';
import { type GeInbound, type GeTurnInput, openTurn, parseInbound, step } from './a2a-mapping';
import { geThreadId } from './gemini-enterprise.adapter';
import { type GeBusEvent, type GeBusThread, GeminiEnterpriseTurnBus } from './gemini-enterprise-turn-bus.service';

/** Gemini Enterprise drops a held stream at ~28 min; close first with a message the user can act on. */
const TURN_DEADLINE_MS = 25 * 60 * 1000;
const KEEP_ALIVE_MS = 15_000;

export type JsonRpcRequest = { jsonrpc?: string; id?: string | number | null; method?: string; params?: unknown };

@Injectable()
export class GeminiEnterpriseInboundService {
  constructor(
    private readonly agentConfigResolver: AgentConfigResolver,
    private readonly registry: ChatInstanceRegistry,
    private readonly turnBus: GeminiEnterpriseTurnBus,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly createOrUpdateSubscriber: CreateOrUpdateSubscriberUseCase,
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
    const thread: GeBusThread = {
      environmentId: config.environmentId,
      integrationIdentifier: config.integrationIdentifier,
      threadId,
    };
    const streamId = randomUUID();
    const abort = new AbortController();
    let turn = openTurn({ taskId: randomUUID(), contextId });

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-store');
    res.flushHeaders();

    const deadline = setTimeout(() => apply({ type: 'deadline' }), TURN_DEADLINE_MS);
    const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), KEEP_ALIVE_MS);
    const finish = () => {
      clearTimeout(deadline);
      clearInterval(keepAlive);
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
      onFailed: (deliveryId) => this.publishEnd(thread, deliveryId),
    };

    try {
      // Our own supersede notice is the read cursor: older streams on this context close, and this
      // stream sees exactly what is published after it.
      const cursor = await this.turnBus.publish(thread, { type: 'superseded', streamId });
      // Handled now: dispatch awaits before `reading` does, and an unhandled rejection exits the process.
      const reading = (async () => {
        for await (const event of this.turnBus.read(thread, cursor, abort.signal)) {
          const input = toTurnInput(event, streamId, slot.deliveryIds);
          if (input) apply(input);
        }
      })().catch((err) => {
        this.logger.error(err, `[agent:${config.agentId}] Gemini Enterprise turn bus read failed`);
        apply({ type: 'end' });
      });

      await this.dispatch(config, threadId, contextId, inbound, slot);

      if (slot.deliveryIds.length === 0) {
        // Nothing reached a bridge (plan limit, no bridge URL, dropped duplicate): end after what was posted.
        const localTurnId = `local:${streamId}`;
        slot.deliveryIds.push(localTurnId);
        await this.publishEnd(thread, localTurnId);
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
    const subscriberId = await this.provisionSubscriber(config, contextId);

    await bridgeDispatchProbe.run(slot, async () => {
      const message = adapter.parseMessage({
        id: inbound.messageId ?? randomUUID(),
        text: inbound.text,
        subscriberId,
      });
      await chat.processMessage(adapter, threadId, message);
    });
  }

  /**
   * Gemini Enterprise sends no end-user identity over A2A, so each conversation (`contextId`)
   * gets its own subscriber. Access is already gated by the integration's secret URL.
   */
  private async provisionSubscriber(config: ResolvedAgentConfig, contextId: string): Promise<string> {
    const { environmentId, organizationId } = config;
    const subscriberId = buildPlatformSubscriberId({
      organizationId,
      integrationIdentifier: config.integrationIdentifier,
      platform: AgentPlatformEnum.GEMINI_ENTERPRISE,
      platformUserId: contextId,
    });

    if (await this.subscriberRepository.findBySubscriberId(environmentId, subscriberId)) {
      return subscriberId;
    }

    await this.createOrUpdateSubscriber.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId,
        organizationId,
        subscriberId,
        data: {
          [AGENT_PROVISION_DATA_KEYS.source]: AGENT_PLATFORM_PROVISION_SOURCE,
          [AGENT_PROVISION_DATA_KEYS.platform]: AgentPlatformEnum.GEMINI_ENTERPRISE,
          [AGENT_PROVISION_DATA_KEYS.platformUserId]: contextId,
          [AGENT_PROVISION_DATA_KEYS.agentIdentifier]: config.agentIdentifier,
          [AGENT_PROVISION_DATA_KEYS.firstSeenAt]: new Date().toISOString(),
        },
      })
    );

    return subscriberId;
  }

  private async publishEnd(thread: GeBusThread, turnId: string): Promise<void> {
    try {
      await this.turnBus.publish(thread, { type: 'end', turnId });
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
