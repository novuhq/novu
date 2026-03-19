import { DurableObject } from 'cloudflare:workers';
import type { IConnectionMetadata, IEnv } from '../types';

/**
 * WebSocket Room Durable Object with Hibernation Support
 * Manages WebSocket connections for subscribers with JWT authentication
 */
export class WebSocketRoom extends DurableObject<IEnv> {
  private static readonly MAX_CONNECTIONS = 100;

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
      this.notifySubscriberOnlineState(userId, environmentId, true, undefined, jwtToken).catch((error) =>
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
      this.handleSubscriberDisconnection(metadata);
    }

    // No need to delete from connectionTokens - using serializeAttachment instead
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
   * Notify the API about subscriber online state changes
   */
  private async notifySubscriberOnlineState(
    subscriberId: string,
    environmentId: string,
    isOnline: boolean,
    organizationId?: string,
    jwtToken?: string
  ): Promise<void> {
    const apiUrl = this.env.API_URL;

    if (!apiUrl) {
      console.warn('API_URL not configured, skipping online state notification');

      return;
    }

    if (!jwtToken) {
      console.warn('JWT token not available, skipping online state notification');

      return;
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
    } catch (error) {
      console.error(`Error notifying API about subscriber online state:`, error);
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

  private handleSubscriberDisconnection(metadata: IConnectionMetadata): void {
    const activeConnections = this.getActiveConnectionsForUser(metadata.userId);

    const remainingConnections = activeConnections - 1;

    if (remainingConnections <= 0) {
      // Use waitUntil to allow hibernation without waiting for API call
      this.ctx.waitUntil(
        this.notifySubscriberOnlineState(
          metadata.userId,
          metadata.environmentId,
          false,
          undefined,
          metadata.jwtToken
        ).catch((error) => console.error('Failed to notify subscriber offline state:', error))
      );
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
