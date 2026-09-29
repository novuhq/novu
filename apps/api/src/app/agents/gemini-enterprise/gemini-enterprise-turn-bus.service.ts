import { Injectable } from '@nestjs/common';
import { CacheService } from '@novu/application-generic';
import type { Cluster, Redis } from 'ioredis';
import type { GeContent } from './a2a-mapping';

/**
 * Everything the pod holding Gemini Enterprise's open `message/stream` response needs to finish a turn.
 * Deliveries (post / edit / typing) and end-of-turn signals can be produced on any API pod, so they
 * travel through one Redis Stream per conversation thread instead of in-process state.
 */
export type GeBusEvent =
  | { type: 'post' | 'edit'; messageId: string; content: GeContent }
  | { type: 'typing'; status?: string }
  | { type: 'end'; turnId: string }
  | { type: 'superseded'; streamId: string };

export type GeBusEntry = { id: string; event: GeBusEvent };

const MAX_LEN = 200;
const TTL_MS = 30 * 60 * 1000;
/** Upper bound between reader wake-ups; the ingress sends a keep-alive on every idle wake-up. */
const BLOCK_MS = 15_000;

export function geTurnBusKey(environmentId: string, integrationIdentifier: string, threadId: string): string {
  return `ge:turns:${environmentId}:${integrationIdentifier}:${threadId}`;
}

@Injectable()
export class GeminiEnterpriseTurnBus {
  constructor(private readonly cacheService: CacheService) {}

  /** Returns the stream entry id, usable as a read cursor that excludes this entry. */
  async publish(key: string, event: GeBusEvent): Promise<string> {
    const client = this.client();
    const id = await client.xadd(key, 'MAXLEN', '~', MAX_LEN, '*', 'e', JSON.stringify(event));
    await client.pexpire(key, TTL_MS);

    return id as string;
  }

  /**
   * Blocking reader on a dedicated connection (XREAD BLOCK would stall the shared client).
   * Yields an empty batch on every idle wake-up. Aborting the signal closes the connection.
   */
  async *read(key: string, fromId: string, signal: AbortSignal): AsyncGenerator<GeBusEntry[]> {
    // Shared clients may disable the offline queue; a fresh connection would reject XREAD until ready.
    const client = this.client() as Redis | Cluster;
    const connection = (
      client.isCluster
        ? (client as Cluster).duplicate([], { enableOfflineQueue: true })
        : (client as Redis).duplicate({ enableOfflineQueue: true })
    ) as Redis;
    const close = () => connection.disconnect();
    signal.addEventListener('abort', close, { once: true });
    let cursor = fromId;

    try {
      while (!signal.aborted) {
        const result = await connection.xread('BLOCK', BLOCK_MS, 'STREAMS', key, cursor);
        const entries = result?.[0]?.[1] ?? [];
        const batch: GeBusEntry[] = [];

        for (const [id, fields] of entries) {
          cursor = id;
          batch.push({ id, event: JSON.parse(fields[1]) as GeBusEvent });
        }

        yield batch;
      }
    } catch (err) {
      if (!signal.aborted) throw err;
    } finally {
      signal.removeEventListener('abort', close);
      connection.disconnect();
    }
  }

  private client(): Redis {
    const { client } = this.cacheService;
    if (!client) {
      throw new Error('Redis client is not available for the Gemini Enterprise turn bus');
    }

    // Cluster exposes the same stream commands; the Redis type keeps the overloads callable.
    return client as Redis;
  }
}
