import { DurableObject } from 'cloudflare:workers';
import type { IConnectionMetadata, IEnv } from '../types';

type ReportedPresence = 'online' | 'offline';

interface IPendingOffline {
  userId: string;
  environmentId: string;
  jwtToken: string;
}

interface INotifyResult {
  ok: boolean;
  /** false for 4xx responses (e.g. expired token) where retrying cannot succeed */
  retryable: boolean;
}

/**
 * WebSocket Room Durable Object with Hibernation Support
 * Manages WebSocket connections for subscribers with JWT authentication
 *
 * Rooms are keyed by `${environmentId}:${userId}`, so each room tracks one subscriber's presence.
 * Presence is reported to the API only when it actually changes:
 * - online is sent once, not for every extra tab or reconnect
 * - offline is delayed by OFFLINE_DEBOUNCE_MS so page reloads and short network drops send nothing
 */
export class WebSocketRoom extends DurableObject<IEnv> {
  private static readonly MAX_CONNECTIONS = 100;
  private static readonly OFFLINE_DEBOUNCE_MS = 30_000;
  // Keeps blockConcurrencyWhile well under its 30s limit if the API hangs
  private static readonly NOTIFY_TIMEOUT_MS = 5_000;
  private static readonly REPORTED_PRESENCE_KEY = 'reportedPresence';
  private static readonly PENDING_OFFLINE_KEY = 'pendingOffline';

  /**
   * Constructor - called when DO is instantiated or wakes from hibernation
   * No need to store JWT tokens in memory as they're persisted with serializeAttachment
   */
  constructor(ctx: DurableObjectState, env: IEnv) {
    super(ctx, env);

    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
  }

  /**
   * Handle incoming HTTP requests (WebSocket upgrades)
   */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    // Check connection limit before accepting new connections
    const currentConnections = this.ctx.getWebSockets().length;
    if (currentConnections >= WebSocketRoom.MAX_CONNECTIONS) {
      return new Response('WebSocket room at capacity', {
        status: 503,
        headers: {
          'Retry-After': '60',
        },
      });
    }

    const userId = request.headers.get('X-User-Id');
    const environmentId = request.headers.get('X-Environment-Id');
    const jwtToken = request.headers.get('X-JWT-Token');

    if (!userId || !environmentId) {
      return new Response('Missing required user information', { status: 400 });
    }

    if (!jwtToken) {
      return new Response('Missing JWT token', { status: 400 });
    }

    const contextKeys = this.extractContextKeysFromHeader(request);

    const [client, server] = Object.values(new WebSocketPair());

    /*
     * Use hibernation-compatible WebSocket acceptance
     * Store JWT token separately to avoid tag size limitations
     */
    const tags = [`user:${userId}`, `env:${environmentId}`];

    this.ctx.acceptWebSocket(server, tags);

    // Persist JWT token with the WebSocket connection to survive hibernation
    // The attachment is limited to 2KB, but a JWT token is typically < 1KB
    server.serializeAttachment({
      jwtToken,
      connectedAt: Date.now(),
      contextKeys,
    });

    // Use waitUntil to allow hibernation without waiting for API call
    this.ctx.waitUntil(
      this.reportOnline(userId, environmentId, jwtToken).catch((error) =>
        console.error('Failed to notify subscriber online state:', error)
      )
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle WebSocket messages (called automatically by Cloudflare runtime)
   */
  async webSocketMessage(ws: WebSocket): Promise<void> {
    const metadata = this.getConnectionMetadata(ws);

    if (!metadata) {
      ws.close(1008, 'Connection metadata not found');
    }
  }

  /**
   * Handle WebSocket connection close (called automatically by Cloudflare runtime)
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    ws.close(code, reason);

    const metadata = this.getConnectionMetadata(ws);

    if (metadata) {
      await this.handleSubscriberDisconnection(ws, metadata);
    }

    // No need to delete from connectionTokens - using serializeAttachment instead
  }

  /**
   * Fires OFFLINE_DEBOUNCE_MS after the subscriber's last socket closed, unless a reconnect cancelled it
   */
  async alarm(): Promise<void> {
    // Never throw inside blockConcurrencyWhile: that resets the object and drops every socket
    const retry = await this.ctx.blockConcurrencyWhile(async () => {
      const pending = await this.ctx.storage.get<IPendingOffline>(WebSocketRoom.PENDING_OFFLINE_KEY);

      if (!pending) {
        return false;
      }

      if (this.getActiveConnectionsForUser(pending.userId) > 0) {
        await this.ctx.storage.delete(WebSocketRoom.PENDING_OFFLINE_KEY);

        return false;
      }

      const reported = await this.ctx.storage.get<ReportedPresence>(WebSocketRoom.REPORTED_PRESENCE_KEY);

      if (reported !== 'offline') {
        /*
         * The API may apply the offline write even when the call fails (lost response, timeout),
         * so the stored state is unknown until it succeeds. Clearing it makes the next connect
         * report online instead of trusting a stale 'online', and a retry still reports offline.
         */
        await this.ctx.storage.delete(WebSocketRoom.REPORTED_PRESENCE_KEY);

        const result = await this.notifySubscriberOnlineState(
          pending.userId,
          pending.environmentId,
          false,
          pending.jwtToken
        );

        if (!result.ok && result.retryable) {
          return true;
        }

        if (result.ok) {
          await this.ctx.storage.put<ReportedPresence>(WebSocketRoom.REPORTED_PRESENCE_KEY, 'offline');
        }
      }

      await this.ctx.storage.delete(WebSocketRoom.PENDING_OFFLINE_KEY);

      return false;
    });

    if (retry) {
      // A failed alarm is retried by the runtime with exponential backoff
      throw new Error('Failed to report subscriber offline state, retrying');
    }
  }

  /**
   * Handle WebSocket errors (called automatically by Cloudflare runtime)
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket error:', error);
    const metadata = this.getConnectionMetadata(ws);

    if (metadata) {
      console.log(`WebSocket error for subscriber: ${metadata.userId}`);
    }

    // No need to delete from connectionTokens - using serializeAttachment instead
  }

  /**
   * Send message to a specific user
   */
  async sendToUser(userId: string, event: string, data: unknown, contextKeys: string[]): Promise<void> {
    const userConnections = this.ctx.getWebSockets(`user:${userId}`);

    if (userConnections.length === 0) {
      return;
    }

    // Pre-serialize the message once to avoid repeated JSON.stringify calls
    const message = JSON.stringify({
      event,
      data,
      timestamp: Date.now(),
    });

    await this.sendToMatchingContexts(userId, message, contextKeys, userConnections);
  }

  /**
   * Context matching logic (same as ws.gateway.ts)
   */
  private isExactMatch(messageContextKeys: string[], inboxContextKeys: string[]): boolean {
    if (messageContextKeys.length === 0) {
      return inboxContextKeys.length === 0;
    }

    if (messageContextKeys.length !== inboxContextKeys.length) {
      return false;
    }

    return messageContextKeys.every((key) => inboxContextKeys.includes(key));
  }

  /**
   * Get active connection count for a user
   */
  getActiveConnectionsForUser(userId: string): number {
    return this.ctx.getWebSockets(`user:${userId}`).length;
  }

  /**
   * Get total active connections in this room
   */
  getTotalActiveConnections(): number {
    return this.ctx.getWebSockets().length;
  }

  /**
   * Get connection capacity information
   */
  getConnectionCapacity(): { current: number; max: number; available: number } {
    const current = this.getTotalActiveConnections();
    const max = WebSocketRoom.MAX_CONNECTIONS;
    const available = max - current;

    return { current, max, available };
  }

  /**
   * Report online once per presence change: cancels a pending offline and skips the API call
   * when online was already reported (extra tabs, reconnects within the debounce window)
   */
  private async reportOnline(userId: string, environmentId: string, jwtToken: string): Promise<void> {
    // Serialized with alarm() so an in-flight offline report cannot land after this online one
    await this.ctx.blockConcurrencyWhile(async () => {
      const pending = await this.ctx.storage.get<IPendingOffline>(WebSocketRoom.PENDING_OFFLINE_KEY);

      if (pending) {
        await this.ctx.storage.deleteAlarm();
        await this.ctx.storage.delete(WebSocketRoom.PENDING_OFFLINE_KEY);
      }

      const reported = await this.ctx.storage.get<ReportedPresence>(WebSocketRoom.REPORTED_PRESENCE_KEY);

      if (reported === 'online') {
        return;
      }

      const result = await this.notifySubscriberOnlineState(userId, environmentId, true, jwtToken);

      if (result.ok) {
        await this.ctx.storage.put<ReportedPresence>(WebSocketRoom.REPORTED_PRESENCE_KEY, 'online');
      }
    });
  }

  /**
   * Notify the API about subscriber online state changes
   */
  private async notifySubscriberOnlineState(
    subscriberId: string,
    environmentId: string,
    isOnline: boolean,
    jwtToken: string
  ): Promise<INotifyResult> {
    const apiUrl = this.env.API_URL;

    if (!apiUrl) {
      console.warn('API_URL not configured, skipping online state notification');

      return { ok: false, retryable: false };
    }

    if (!jwtToken) {
      console.warn('JWT token not available, skipping online state notification');

      return { ok: false, retryable: false };
    }

    try {
      const response = await fetch(`${apiUrl}/v1/internal/subscriber-online-state`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwtToken}`,
        },
        body: JSON.stringify({
          subscriberId,
          environmentId,
          isOnline,
          timestamp: Date.now(),
        }),
        signal: AbortSignal.timeout(WebSocketRoom.NOTIFY_TIMEOUT_MS),
      });

      if (!response.ok) {
        console.error(`Failed to notify API about subscriber online state: ${response.status} ${response.statusText}`);

        return { ok: false, retryable: response.status >= 500 || response.status === 429 };
      }

      return { ok: true, retryable: false };
    } catch (error) {
      console.error(`Error notifying API about subscriber online state:`, error);

      return { ok: false, retryable: true };
    }
  }

  private getConnectionMetadata(ws: WebSocket): IConnectionMetadata | null {
    const tags = this.ctx.getTags(ws);

    // Retrieve persisted attachment data that survived hibernation
    const attachment = ws.deserializeAttachment();

    if (!attachment || typeof attachment !== 'object' || !('jwtToken' in attachment)) {
      return null;
    }

    let userId: string | undefined;
    let environmentId: string | undefined;

    for (const tag of tags) {
      if (tag.startsWith('user:')) {
        userId = tag.substring(5);
      } else if (tag.startsWith('env:')) {
        environmentId = tag.substring(4);
      }
    }

    if (!userId || !environmentId) {
      return null;
    }

    return {
      userId,
      environmentId,
      connectedAt: attachment.connectedAt || Date.now(),
      jwtToken: attachment.jwtToken,
      contextKeys: attachment.contextKeys,
    };
  }

  /**
   * Schedule the offline report instead of sending it, so a quick reconnect cancels it.
   * Counts the remaining sockets without the closing one, whether or not the runtime still lists it.
   */
  private async handleSubscriberDisconnection(closingWs: WebSocket, metadata: IConnectionMetadata): Promise<void> {
    const remainingConnections = this.ctx
      .getWebSockets(`user:${metadata.userId}`)
      .filter((socket) => socket !== closingWs).length;

    if (remainingConnections > 0) {
      return;
    }

    const pending: IPendingOffline = {
      userId: metadata.userId,
      environmentId: metadata.environmentId,
      jwtToken: metadata.jwtToken,
    };

    await this.ctx.storage.put(WebSocketRoom.PENDING_OFFLINE_KEY, pending);
    await this.ctx.storage.setAlarm(Date.now() + WebSocketRoom.OFFLINE_DEBOUNCE_MS);
  }

  private extractContextKeysFromHeader(request: Request): string[] {
    const contextKeysHeader = request.headers.get('X-Context-Keys');

    if (!contextKeysHeader || contextKeysHeader === '') {
      return [];
    }

    try {
      return JSON.parse(contextKeysHeader);
    } catch (e) {
      console.error('Failed to parse contextKeys:', e);

      return [];
    }
  }

  /**
   * Send message only to sockets with matching contexts
   */
  private async sendToMatchingContexts(
    userId: string,
    message: string,
    messageContextKeys: string[],
    sockets: WebSocket[]
  ): Promise<void> {
    const sendPromises = sockets.map(async (ws) => {
      const metadata = this.getConnectionMetadata(ws);

      if (!metadata) {
        return;
      }

      const inboxContextKeys = metadata.contextKeys;

      if (this.shouldDeliverMessage(messageContextKeys, inboxContextKeys)) {
        await this.deliverMessageToSocket(ws, message, userId, inboxContextKeys);
      }
    });

    await Promise.allSettled(sendPromises);
  }

  /**
   * Determine if message should be delivered based on context match
   */
  private shouldDeliverMessage(messageContextKeys: string[], inboxContextKeys: string[]): boolean {
    return this.isExactMatch(messageContextKeys, inboxContextKeys);
  }

  /**
   * Deliver message to a specific socket
   */
  private async deliverMessageToSocket(
    ws: WebSocket,
    message: string,
    userId: string,
    _inboxContextKeys?: string[]
  ): Promise<void> {
    try {
      ws.send(message);
    } catch (error) {
      console.error(`Failed to send message to user ${userId}:`, error);
      throw error;
    }
  }
}
