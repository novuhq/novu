import { DurableObject } from 'cloudflare:workers';
import jwt from '@tsndr/cloudflare-worker-jwt';
import type { IConnectionMetadata, IEnv } from '../types';

type ReportedPresence = 'online' | 'offline';

interface IPendingOffline {
  userId: string;
  environmentId: string;
  jwtToken: string;
  /** Missing on entries stored before deadlines existed: treated as due now */
  dueAt?: number;
  attempts?: number;
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
  private static readonly OFFLINE_RETRY_BASE_MS = 2_000;
  private static readonly MAX_OFFLINE_ATTEMPTS = 6;
  // The SDK recognises this close to refresh the session before reconnecting
  private static readonly SESSION_EXPIRED_CLOSE = { code: 4001, reason: 'session_expired' };

  /**
   * Constructor - called when DO is instantiated or wakes from hibernation
   * No need to store JWT tokens in memory as they're persisted with serializeAttachment
   */
  constructor(ctx: DurableObjectState, env: IEnv) {
    super(ctx, env);

    this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    // Adopts sockets accepted before expiry closing existed, which have no alarm set for them
    this.ctx.blockConcurrencyWhile(() => this.#scheduleNextAlarm());
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
   * Closes sockets whose session expired, then reports offline once OFFLINE_DEBOUNCE_MS passed
   * after the subscriber's last socket closed, unless a reconnect cancelled it
   */
  async alarm(): Promise<void> {
    // Never throw inside blockConcurrencyWhile: that resets the object and drops every socket
    await this.ctx.blockConcurrencyWhile(async () => {
      await this.closeExpiredSockets();
      await this.flushPendingOffline();
      await this.#scheduleNextAlarm();
    });
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
        await this.ctx.storage.delete(WebSocketRoom.PENDING_OFFLINE_KEY);
      }

      // The new socket's session may expire before every other deadline
      await this.#scheduleNextAlarm();

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
          // Lets the API accept the session after it expired: sockets are closed at expiry and reported offline later
          'X-Novu-Internal-Key': this.env.INTERNAL_API_KEY,
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
   * Counts only open sockets other than the closing one, whether or not the runtime still lists it.
   */
  private async handleSubscriberDisconnection(closingWs: WebSocket, metadata: IConnectionMetadata): Promise<void> {
    const remainingConnections = this.getOpenSockets(metadata.userId).filter((socket) => socket !== closingWs).length;

    if (remainingConnections > 0) {
      return;
    }

    await this.recordPendingOffline(metadata);
    await this.#scheduleNextAlarm();
  }

  // Keeps an existing entry, so the alarm's expiry close and the runtime's close event record one offline
  private async recordPendingOffline(metadata: IConnectionMetadata): Promise<void> {
    if (await this.ctx.storage.get<IPendingOffline>(WebSocketRoom.PENDING_OFFLINE_KEY)) {
      return;
    }

    const pending: IPendingOffline = {
      userId: metadata.userId,
      environmentId: metadata.environmentId,
      jwtToken: metadata.jwtToken,
      dueAt: Date.now() + WebSocketRoom.OFFLINE_DEBOUNCE_MS,
      attempts: 0,
    };

    await this.ctx.storage.put(WebSocketRoom.PENDING_OFFLINE_KEY, pending);
  }

  private async closeExpiredSockets(): Promise<void> {
    const now = Date.now();
    let lastExpired: IConnectionMetadata | null = null;

    for (const ws of this.getOpenSockets()) {
      const expiresAt = this.getSessionExpiresAt(ws);

      if (expiresAt !== undefined && expiresAt <= now) {
        lastExpired = this.getConnectionMetadata(ws);
        ws.close(WebSocketRoom.SESSION_EXPIRED_CLOSE.code, WebSocketRoom.SESSION_EXPIRED_CLOSE.reason);
      }
    }

    if (lastExpired && this.getOpenSockets(lastExpired.userId).length === 0) {
      await this.recordPendingOffline(lastExpired);
    }
  }

  private async flushPendingOffline(): Promise<void> {
    const pending = await this.ctx.storage.get<IPendingOffline>(WebSocketRoom.PENDING_OFFLINE_KEY);

    if (!pending || (pending.dueAt ?? 0) > Date.now()) {
      return;
    }

    if (this.getOpenSockets(pending.userId).length > 0) {
      await this.ctx.storage.delete(WebSocketRoom.PENDING_OFFLINE_KEY);

      return;
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
      const attempts = (pending.attempts ?? 0) + 1;

      if (!result.ok && result.retryable && attempts < WebSocketRoom.MAX_OFFLINE_ATTEMPTS) {
        const retry: IPendingOffline = {
          ...pending,
          attempts,
          dueAt: Date.now() + WebSocketRoom.OFFLINE_RETRY_BASE_MS * 2 ** (attempts - 1),
        };
        await this.ctx.storage.put(WebSocketRoom.PENDING_OFFLINE_KEY, retry);

        return;
      }

      if (result.ok) {
        await this.ctx.storage.put<ReportedPresence>(WebSocketRoom.REPORTED_PRESENCE_KEY, 'offline');
      }
    }

    await this.ctx.storage.delete(WebSocketRoom.PENDING_OFFLINE_KEY);
  }

  // The only caller of setAlarm/deleteAlarm: one alarm serves the offline debounce and every session expiry
  async #scheduleNextAlarm(): Promise<void> {
    const deadlines: number[] = [];
    const pending = await this.ctx.storage.get<IPendingOffline>(WebSocketRoom.PENDING_OFFLINE_KEY);

    if (pending) {
      deadlines.push(pending.dueAt ?? Date.now());
    }

    for (const ws of this.getOpenSockets()) {
      const expiresAt = this.getSessionExpiresAt(ws);

      if (expiresAt !== undefined) {
        deadlines.push(expiresAt);
      }
    }

    if (deadlines.length === 0) {
      await this.ctx.storage.deleteAlarm();

      return;
    }

    const next = Math.min(...deadlines);

    if ((await this.ctx.storage.getAlarm()) !== next) {
      await this.ctx.storage.setAlarm(next);
    }
  }

  // A socket we closed stays listed until the close handshake ends, so only OPEN ones count
  private getOpenSockets(userId?: string): WebSocket[] {
    return this.ctx
      .getWebSockets(userId ? `user:${userId}` : undefined)
      .filter((ws) => ws.readyState === WebSocket.READY_STATE_OPEN);
  }

  // The token was verified at connect, so its exp is trusted here
  private getSessionExpiresAt(ws: WebSocket): number | undefined {
    const metadata = this.getConnectionMetadata(ws);

    if (!metadata) {
      return undefined;
    }

    try {
      const { exp } = jwt.decode(metadata.jwtToken).payload ?? {};

      return typeof exp === 'number' ? exp * 1000 : undefined;
    } catch {
      return undefined;
    }
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
