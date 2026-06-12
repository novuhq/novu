import { DurableObject } from 'cloudflare:workers';
import type { IConnectionMetadata, IEnv, IOnlineReportRecord } from '../types';

/**
 * WebSocket Room Durable Object with Hibernation Support
 * Manages WebSocket connections for subscribers with JWT authentication
 */
export class WebSocketRoom extends DurableObject<IEnv> {
  private static readonly MAX_CONNECTIONS = 100;

  /**
   * How long to wait after the last connection closes before reporting the
   * subscriber as offline. Quick reconnects (page navigations, reloads) within
   * this window cancel out the offline+online API call pair entirely.
   */
  private static readonly OFFLINE_DEBOUNCE_MS = 60_000;

  /**
   * How long a successful online report is trusted before being re-asserted.
   * Bounds divergence caused by external writers (legacy ws service), failed
   * API calls, or out-of-band DB changes, while keeping API traffic low.
   */
  private static readonly ONLINE_REASSERT_TTL_MS = 6 * 60 * 60 * 1000;

  private static readonly ONLINE_REPORT_KEY = 'onlineReport';

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
      this.reportOnlineIfNeeded(currentConnections, userId, environmentId, jwtToken).catch((error) =>
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

    // The closing socket is still included in getWebSockets() at this point
    const remainingConnections = this.ctx.getWebSockets().length - 1;

    if (remainingConnections <= 0) {
      await this.scheduleOfflineReport();
    }
  }

  /**
   * Debounced offline reporting: fires OFFLINE_DEBOUNCE_MS after the last
   * connection closes. If the subscriber reconnected in the meantime, this is
   * a no-op and no offline/online API call pair is sent at all.
   */
  async alarm(): Promise<void> {
    if (this.ctx.getWebSockets().length > 0) {
      return;
    }

    const report = await this.ctx.storage.get<IOnlineReportRecord>(WebSocketRoom.ONLINE_REPORT_KEY);

    if (!report?.jwtToken) {
      console.warn('No online report record available, skipping offline notification');

      return;
    }

    const succeeded = await this.notifySubscriberOnlineState(
      report.userId,
      report.environmentId,
      false,
      undefined,
      report.jwtToken
    );

    if (!succeeded) {
      // Throwing makes the Cloudflare runtime retry the alarm with backoff
      throw new Error('Failed to report subscriber offline state, alarm will be retried');
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
   * Report the subscriber as online unless it is redundant. The online state
   * is considered already reported when the room had live connections before
   * this one, or when an offline alarm is still pending (the offline report
   * was never sent). A successful report older than ONLINE_REASSERT_TTL_MS is
   * re-asserted regardless, to self-heal external state divergence.
   */
  private async reportOnlineIfNeeded(
    connectionsBeforeAccept: number,
    userId: string,
    environmentId: string,
    jwtToken: string
  ): Promise<void> {
    const [pendingAlarm, report] = await Promise.all([
      this.ctx.storage.getAlarm(),
      this.ctx.storage.get<IOnlineReportRecord>(WebSocketRoom.ONLINE_REPORT_KEY),
    ]);

    const isFreshlyReported =
      report !== undefined && Date.now() - report.reportedAt < WebSocketRoom.ONLINE_REASSERT_TTL_MS;
    const isAlreadyOnline = connectionsBeforeAccept > 0 || pendingAlarm !== null;

    if (isAlreadyOnline && isFreshlyReported) {
      return;
    }

    const succeeded = await this.notifySubscriberOnlineState(userId, environmentId, true, undefined, jwtToken);

    if (succeeded) {
      const record: IOnlineReportRecord = { reportedAt: Date.now(), jwtToken, userId, environmentId };
      await this.ctx.storage.put(WebSocketRoom.ONLINE_REPORT_KEY, record);
    }
  }

  /**
   * Schedule the debounced offline report. An already pending alarm is left
   * untouched (resetting or deleting alarms costs extra storage writes and the
   * alarm handler no-ops when connections exist anyway).
   */
  private async scheduleOfflineReport(): Promise<void> {
    const pendingAlarm = await this.ctx.storage.getAlarm();

    if (pendingAlarm !== null) {
      return;
    }

    await this.ctx.storage.setAlarm(Date.now() + WebSocketRoom.OFFLINE_DEBOUNCE_MS);
  }

  /**
   * Notify the API about subscriber online state changes
   */
  private async notifySubscriberOnlineState(
    subscriberId: string,
    environmentId: string,
    isOnline: boolean,
    organizationId?: string,
    jwtToken?: string
  ): Promise<boolean> {
    const apiUrl = this.env.API_URL;

    if (!apiUrl) {
      console.warn('API_URL not configured, skipping online state notification');

      return false;
    }

    if (!jwtToken) {
      console.warn('JWT token not available, skipping online state notification');

      return false;
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
          organizationId,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        console.error(`Failed to notify API about subscriber online state: ${response.status} ${response.statusText}`);
      }

      return response.ok;
    } catch (error) {
      console.error(`Error notifying API about subscriber online state:`, error);

      return false;
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
