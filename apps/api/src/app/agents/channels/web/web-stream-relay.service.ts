import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { CacheService, PinoLogger } from '@novu/application-generic';
import { captureAgentWarning } from '../../shared/errors/capture-agent-sentry';
import { parseWebOutboundEvent, type WebOutboundEvent } from './web-relay-events';

type RelayHandler = (event: WebOutboundEvent) => void;

interface RedisSubscriberClient {
  subscribe(channel: string): Promise<unknown>;
  unsubscribe(channel: string): Promise<unknown>;
  on(event: 'message', listener: (channel: string, message: string) => void): unknown;
  quit(): Promise<unknown>;
}

/**
 * Per-process fan-in for web agent replies. The web adapter publishes outbound
 * events to a Redis pub/sub channel per conversation thread; whichever
 * api-service instance holds the browser's open SSE stream subscribes here and
 * pumps the events down. Publishes with zero subscribers are the expected
 * steady state (persistence already happened in the outbound gateway; clients
 * recover via history refetch).
 *
 * A single duplicated Redis connection is used for all subscriptions —
 * ioredis connections in subscriber mode cannot issue regular commands, so the
 * shared cache client cannot be reused directly.
 */
@Injectable()
export class WebStreamRelay implements OnModuleDestroy {
  private subscriberClient: RedisSubscriberClient | null = null;
  private readonly handlers = new Map<string, Set<RelayHandler>>();

  constructor(
    private readonly cacheService: CacheService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Registers a handler for a relay channel and returns an async disposer.
   * Subscribe BEFORE dispatching the inbound turn: a reply published between
   * dispatch and SUBSCRIBE would otherwise be dropped from the live stream.
   */
  async subscribe(channel: string, handler: RelayHandler): Promise<() => Promise<void>> {
    const client = this.ensureSubscriberClient();

    let channelHandlers = this.handlers.get(channel);
    const isFirstForChannel = !channelHandlers;
    if (!channelHandlers) {
      channelHandlers = new Set();
      this.handlers.set(channel, channelHandlers);
    }
    channelHandlers.add(handler);

    if (isFirstForChannel) {
      try {
        await client.subscribe(channel);
      } catch (err) {
        channelHandlers.delete(handler);
        if (channelHandlers.size === 0) {
          this.handlers.delete(channel);
        }
        throw err;
      }
    }

    let disposed = false;

    return async () => {
      if (disposed) return;
      disposed = true;

      const current = this.handlers.get(channel);
      if (!current) return;

      current.delete(handler);
      if (current.size === 0) {
        this.handlers.delete(channel);
        try {
          await client.unsubscribe(channel);
        } catch (err) {
          this.logger.warn(err, `Failed to unsubscribe web relay channel ${channel}`);
        }
      }
    };
  }

  private ensureSubscriberClient(): RedisSubscriberClient {
    if (this.subscriberClient) {
      return this.subscriberClient;
    }

    const baseClient = this.cacheService.client;
    if (!baseClient) {
      throw new Error('Cache in-memory provider client is not available for the web stream relay');
    }

    const duplicated = (baseClient as unknown as { duplicate(): RedisSubscriberClient }).duplicate();
    duplicated.on('message', (channel: string, payload: string) => this.dispatch(channel, payload));
    this.subscriberClient = duplicated;

    return duplicated;
  }

  private dispatch(channel: string, payload: string): void {
    const channelHandlers = this.handlers.get(channel);
    if (!channelHandlers?.size) {
      return;
    }

    const event = parseWebOutboundEvent(payload);
    if (!event) {
      this.logger.warn({ channel }, 'Dropping malformed web relay event');
      captureAgentWarning(new Error('Malformed web relay event'), {
        component: 'web-stream-relay',
        operation: 'dispatch',
        extra: { channel },
      });

      return;
    }

    for (const handler of channelHandlers) {
      try {
        handler(event);
      } catch (err) {
        this.logger.warn(err, `Web relay handler failed for channel ${channel}`);
      }
    }
  }

  async onModuleDestroy() {
    this.handlers.clear();
    if (this.subscriberClient) {
      try {
        await this.subscriberClient.quit();
      } catch (err) {
        this.logger.warn(err, 'Failed to close web relay subscriber connection');
      }
      this.subscriberClient = null;
    }
  }
}
