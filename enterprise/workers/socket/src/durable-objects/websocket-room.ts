import { DurableObject } from 'cloudflare:workers';
import type { IEnv, IConnectionMetadata } from '../types';

/**
 * WebSocket Room Durable Object
 * Manages WebSocket connections for subscribers with JWT authentication
 */
export class WebSocketRoom extends DurableObject<IEnv> {
  private connections: Map<WebSocket, IConnectionMetadata> = new Map();
  private userConnections: Map<string, Set<WebSocket>> = new Map();

  /**
   * Handle incoming HTTP requests (WebSocket upgrades)
   */
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const userId = request.headers.get('X-User-Id');
    const subscriberId = request.headers.get('X-Subscriber-Id');
    const organizationId = request.headers.get('X-Organization-Id');
    const environmentId = request.headers.get('X-Environment-Id');

    if (!userId || !organizationId || !environmentId) {
      return new Response('Missing required user information', { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    server.accept();

    const metadata: IConnectionMetadata = {
      subscriberId,
      userId,
      organizationId,
      environmentId,
      connectedAt: Date.now(),
    };

    this.connections.set(server, metadata);

    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }

    this.userConnections.get(userId)!.add(server);

    this.setupWebSocketHandlers(server, metadata);

    console.log(
      `WebSocket connected for subscriber: ${metadata.subscriberId} (${userId}) in room ${organizationId}:${environmentId}`
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle WebSocket messages
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const metadata = this.connections.get(ws);
    if (!metadata) {
      ws.close(1008, 'Connection not found');

      return;
    }

    try {
      if (typeof message === 'string') {
        const data = JSON.parse(message);
        await this.handleMessage(ws, data, metadata);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      ws.send(JSON.stringify({ error: 'Invalid message format' }));
    }
  }

  /**
   * Handle WebSocket connection close
   */
  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): Promise<void> {
    const metadata = this.connections.get(ws);
    if (metadata) {
      console.log(`WebSocket connection closed for subscriber: ${metadata.subscriberId} (${metadata.userId})`);

      this.connections.delete(ws);

      const userConnections = this.userConnections.get(metadata.userId);

      if (userConnections) {
        userConnections.delete(ws);

        if (userConnections.size === 0) {
          this.userConnections.delete(metadata.userId);
        }
      }

      await this.handleSubscriberDisconnection(metadata);
    }
  }

  /**
   * Handle WebSocket errors
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket error:', error);
    const metadata = this.connections.get(ws);
    if (metadata) {
      console.log(`WebSocket error for subscriber: ${metadata.subscriberId} (${metadata.userId})`);
    }
  }

  /**
   * Send message to a specific user
   */
  async sendToUser(userId: string, event: string, data: any): Promise<void> {
    const userConnections = this.userConnections.get(userId);
    if (!userConnections || userConnections.size === 0) {
      console.log(`No active connections found for user: ${userId}`);

      return;
    }

    const message = JSON.stringify({
      event,
      data,
      timestamp: Date.now(),
    });

    console.log(`Sending event ${event} to user ${userId} (${userConnections.size} connections)`);

    for (const ws of userConnections) {
      try {
        ws.send(message);
      } catch (error) {
        console.error(`Failed to send message to connection:`, error);
        // Remove failed connection
        userConnections.delete(ws);
        this.connections.delete(ws);
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

    for (const [ws, metadata] of this.connections) {
      if (excludeUserId && metadata.userId === excludeUserId) {
        continue;
      }

      try {
        ws.send(message);
      } catch (error) {
        console.error(`Failed to broadcast to connection:`, error);
        // Remove failed connection
        this.connections.delete(ws);
        const userConnections = this.userConnections.get(metadata.userId);
        if (userConnections) {
          userConnections.delete(ws);
        }
      }
    }
  }

  /**
   * Get active connection count for a user
   */
  getActiveConnectionsForUser(userId: string): number {
    return this.userConnections.get(userId)?.size || 0;
  }

  /**
   * Get all connected users
   */
  getConnectedUsers(): string[] {
    return Array.from(this.userConnections.keys());
  }

  /**
   * Private helper methods
   */

  private setupWebSocketHandlers(ws: WebSocket, metadata: IConnectionMetadata): void {
    // Set up event handlers
    ws.addEventListener('message', (event) => {
      this.webSocketMessage(ws, event.data);
    });

    ws.addEventListener('close', (event) => {
      this.webSocketClose(ws, event.code, event.reason, event.wasClean);
    });

    ws.addEventListener('error', (event) => {
      this.webSocketError(ws, event);
    });

    // Send welcome message
    ws.send(
      JSON.stringify({
        event: 'connected',
        data: {
          subscriberId: metadata.subscriberId,
          userId: metadata.userId,
          connectedAt: metadata.connectedAt,
        },
      })
    );
  }

  private async handleMessage(ws: WebSocket, data: any, metadata: IConnectionMetadata): Promise<void> {
    // Handle different message types
    switch (data.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      case 'subscribe':
        // Handle room subscription if needed
        break;

      default:
        console.log(`Received unknown message type: ${data.type} from ${metadata.subscriberId}`);
    }
  }

  private async handleSubscriberDisconnection(metadata: IConnectionMetadata): Promise<void> {
    const activeConnections = this.getActiveConnectionsForUser(metadata.userId);

    console.log(`Disconnect request received from ${metadata.userId}. Active connections: ${activeConnections}`);

    if (activeConnections === 0) {
      console.log(`Subscriber ${metadata.subscriberId} is now offline`);
    }
  }
}
