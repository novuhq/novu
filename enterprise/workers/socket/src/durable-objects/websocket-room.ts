import { DurableObject } from 'cloudflare:workers';
import type { IEnv, IConnectionMetadata } from '../types';

/**
 * WebSocket Room Durable Object with Hibernation Support
 * Manages WebSocket connections for subscribers with JWT authentication
 */
export class WebSocketRoom extends DurableObject<IEnv> {
	/**
	 * Handle incoming HTTP requests (WebSocket upgrades)
	 */
	async fetch(request: Request): Promise<Response> {
		if (request.headers.get('Upgrade') !== 'websocket') {
			return new Response('Expected WebSocket upgrade', { status: 426 });
		}

		const userId = request.headers.get('X-User-Id');
		const environmentId = request.headers.get('X-Environment-Id');

		if (!userId || !environmentId) {
			return new Response('Missing required user information', { status: 400 });
		}

		const [client, server] = Object.values(new WebSocketPair());

		/*
		 * Use hibernation-compatible WebSocket acceptance
		 * This allows the Durable Object to hibernate while keeping WebSocket connections alive
		 */
		const tags = [`user:${userId}`, `env:${environmentId}`];

		this.ctx.acceptWebSocket(server, tags);

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

		// Notify API that subscriber is online
		await this.notifySubscriberOnlineState(userId, environmentId, true);

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
	async webSocketClose(ws: WebSocket): Promise<void> {
		const metadata = this.getConnectionMetadata(ws);

		if (metadata) {
			console.log(`WebSocket connection closed for subscriber: ${metadata.userId}`);
			await this.handleSubscriberDisconnection(metadata);
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
		organizationId?: string
	): Promise<void> {
		const apiUrl = this.env.API_URL;
		const apiKey = this.env.INTERNAL_API_KEY;

		if (!apiUrl || !apiKey) {
			console.warn('API_URL or INTERNAL_API_KEY not configured, skipping online state notification');

			return;
		}

		try {
			const response = await fetch(`${apiUrl}/v1/internal/subscriber-online-state`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`,
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
			connectedAt: Date.now(),
		};
	}

	private async handleSubscriberDisconnection(metadata: IConnectionMetadata): Promise<void> {
		const activeConnections = this.getActiveConnectionsForUser(metadata.userId);

		console.log(`Disconnect request received from ${metadata.userId}. Active connections: ${activeConnections}`);

		if (activeConnections === 0) {
			console.log(`Subscriber ${metadata.userId} is now offline`);
			// Notify API that subscriber is offline
			await this.notifySubscriberOnlineState(metadata.userId, metadata.environmentId, false);
		}
	}
}
