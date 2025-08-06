import { DurableObject } from 'cloudflare:workers';
import type { IConnectionMetadata, IEnv } from '../types';

/**
 * WebSocket Room Durable Object with Hibernation Support
 * Manages WebSocket connections for subscribers with JWT authentication
 */
export class WebSocketRoom extends DurableObject<IEnv> {
  private connectionTokens = new Map<WebSocket, string>();

  /**
   * Handle incoming HTTP requests (WebSocket upgrades)
   */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
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

    const [client, server] = Object.values(new WebSocketPair());

    /*
     * Use hibernation-compatible WebSocket acceptance
     * Store JWT token separately to avoid tag size limitations
     */
    const tags = [`user:${userId}`, `env:${environmentId}`];

    this.ctx.acceptWebSocket(server, tags);

    // Store JWT token for this connection
    this.connectionTokens.set(server, jwtToken);

    server.send(
      JSON.stringify({
        event: 'connected',
        data: {
          userId,
          connectedAt: Date.now(),
        },
      })
    );

    console.log(`WebSocket connected for subscriber: ${userId} in room ${environmentId}`);

    // Notify API that subscriber is online using JWT authentication
    await this.notifySubscriberOnlineState(userId, environmentId, true, undefined, jwtToken);

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
      console.log(`WebSocket connection closed for subscriber: ${metadata.userId}`);
      await this.handleSubscriberDisconnection(metadata);
    }

    // Clean up stored JWT token
    this.connectionTokens.delete(ws);
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

    // Clean up stored JWT token
    this.connectionTokens.delete(ws);
  }

  /**
   * Send message to a specific user
   */
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    const userConnections = this.ctx.getWebSockets(`user:${userId}`);

    if (userConnections.length === 0) {
      console.log(`No active connections found for user: ${userId}`);

      return;
    }

    const message = JSON.stringify({
      event,
      data,
      timestamp: Date.now(),
    });

    console.log(`Sending event ${event} to user ${userId} (${userConnections.length} connections)`);

    for (const ws of userConnections) {
      try {
        ws.send(message);
      } catch (error) {
        console.error(`Failed to send message to connection:`, error);
        // No manual cleanup needed - Cloudflare handles this automatically
      }
    }
  }

  /**
   * Broadcast message to all connections in the room
   */
  async broadcast(event: string, data: any, excludeUserId?: string): Promise<void> {
    const message = JSON.stringify({
      event,
      data,
      timestamp: Date.now(),
    });

    const allConnections = this.ctx.getWebSockets();

    for (const ws of allConnections) {
      if (excludeUserId) {
        const metadata = this.getConnectionMetadata(ws);
        if (metadata && metadata.userId === excludeUserId) {
          continue;
        }
      }

      try {
        ws.send(message);
      } catch (error) {
        console.error(`Failed to broadcast to connection:`, error);
        // No manual cleanup needed - Cloudflare handles this automatically
      }
    }
  }

  /**
   * Get active connection count for a user
   */
  getActiveConnectionsForUser(userId: string): number {
    return this.ctx.getWebSockets(`user:${userId}`).length;
  }

  /**
   * Get all connected users
   */
  getConnectedUsers(): string[] {
    const allConnections = this.ctx.getWebSockets();
    const users = new Set<string>();

    for (const ws of allConnections) {
      const metadata = this.getConnectionMetadata(ws);

      if (metadata) {
        users.add(metadata.userId);
      }
    }

    return Array.from(users);
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
      } else {
        console.log(`Successfully notified API: subscriber ${subscriberId} is ${isOnline ? 'online' : 'offline'}`);
      }
    } catch (error) {
      console.error(`Error notifying API about subscriber online state:`, error);
    }
  }

  private getConnectionMetadata(ws: WebSocket): IConnectionMetadata | null {
    const tags = this.ctx.getTags(ws);
    const jwtToken = this.connectionTokens.get(ws);

    let userId: string | undefined;
    let environmentId: string | undefined;

    for (const tag of tags) {
      if (tag.startsWith('user:')) {
        userId = tag.substring(5);
      } else if (tag.startsWith('env:')) {
        environmentId = tag.substring(4);
      }
    }

    if (!userId || !environmentId || !jwtToken) {
      return null;
    }

    return {
      userId,
      environmentId,
      connectedAt: Date.now(),
      jwtToken,
    };
  }

  private async handleSubscriberDisconnection(metadata: IConnectionMetadata): Promise<void> {
    const activeConnections = this.getActiveConnectionsForUser(metadata.userId);

    const remainingConnections = activeConnections - 1;

    console.log(
      `Disconnect request received from ${metadata.userId}. Active connections: ${activeConnections}, remaining: ${remainingConnections}`
    );

    if (remainingConnections <= 0) {
      console.log(`Subscriber ${metadata.userId} is now offline`);
      // Notify API that subscriber is offline using JWT authentication
      await this.notifySubscriberOnlineState(
        metadata.userId,
        metadata.environmentId,
        false,
        undefined,
        metadata.jwtToken
      );
    }
  }
}
