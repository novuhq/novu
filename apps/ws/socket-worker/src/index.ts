import { DurableObject } from 'cloudflare:workers';
import jwt from '@tsndr/cloudflare-worker-jwt';

// JWT utility functions
async function verifyJWT(token: string, secret: string): Promise<boolean> {
	return await jwt.verify(token, secret);
}

function decodeJWT(token: string): any {
	return jwt.decode(token);
}

/**
 * Welcome to Cloudflare Workers! This is your first Durable Objects application.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your Durable Object in action
 * - Run `npm run deploy` to publish your application
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/durable-objects
 */

interface IEnv {
	WEBSOCKET_ROOM: DurableObjectNamespace<WebSocketRoom>;
	JWT_SECRET: string;
}

// Types for JWT payload
interface ISubscriberJwt {
	_id: string;
	firstName: string;
	lastName: string;
	email: string;
	subscriberId: string;
	organizationId: string;
	environmentId: string;
	aud: 'widget_user';
	iat?: number;
	exp?: number;
}

// WebSocket events enum
enum WebSocketEventEnum {
	RECEIVED = 'notification_received',
	UNREAD = 'unread_count_changed',
	UNSEEN = 'unseen_count_changed',
}

// Connection metadata
interface IConnectionMetadata {
	subscriberId: string;
	userId: string;
	organizationId: string;
	environmentId: string;
	connectedAt: number;
}

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
		// Only accept WebSocket upgrade requests
		if (request.headers.get('Upgrade') !== 'websocket') {
			return new Response('Expected WebSocket upgrade', { status: 426 });
		}

		// Extract user information from headers (already verified by main worker)
		const userId = request.headers.get('X-User-Id');
		const subscriberId = request.headers.get('X-Subscriber-Id');
		const organizationId = request.headers.get('X-Organization-Id');
		const environmentId = request.headers.get('X-Environment-Id');
		const userEmail = request.headers.get('X-User-Email');
		const userName = request.headers.get('X-User-Name');

		if (!userId || !organizationId || !environmentId) {
			return new Response('Missing required user information', { status: 400 });
		}

		// Create WebSocket pair
		const [client, server] = Object.values(new WebSocketPair());

		// Accept the WebSocket connection
		server.accept();

		// Create connection metadata
		const metadata: IConnectionMetadata = {
			subscriberId: subscriberId || userId,
			userId,
			organizationId,
			environmentId,
			connectedAt: Date.now(),
		};

		// Store connection
		this.connections.set(server, metadata);

		// Track user connections
		if (!this.userConnections.has(userId)) {
			this.userConnections.set(userId, new Set());
		}
		this.userConnections.get(userId)!.add(server);

		// Set up WebSocket handlers
		this.setupWebSocketHandlers(server, metadata);

		console.log(`WebSocket connected for subscriber: ${metadata.subscriberId} (${userId}) in room ${organizationId}:${environmentId}`);

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

			// Remove from tracking maps
			this.connections.delete(ws);
			const userConnections = this.userConnections.get(metadata.userId);
			if (userConnections) {
				userConnections.delete(ws);
				if (userConnections.size === 0) {
					this.userConnections.delete(metadata.userId);
				}
			}

			// Handle subscriber offline status
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

		// Send to all user connections
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
			}),
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

		/*
		 * Here you could call an external service to update subscriber online status
		 * For now, we'll just log it
		 */
		if (activeConnections === 0) {
			console.log(`Subscriber ${metadata.subscriberId} is now offline`);
		}
	}
}

/**
 * Main Worker handler
 */
export default {
	/**
	 * This is the standard fetch handler for a Cloudflare Worker
	 *
	 * @param request - The request submitted to the Worker from the client
	 * @param env - The interface to reference bindings declared in wrangler.jsonc
	 * @param ctx - The execution context of the Worker
	 * @returns The response to be sent back to the client
	 */
	async fetch(request: Request, env: IEnv, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Route WebSocket connections to Durable Objects
		if (url.pathname === '/ws') {
			// Verify JWT token first
			const authHeader = request.headers.get('Authorization');
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				return new Response('Unauthorized: Missing or invalid Authorization header', { status: 401 });
			}

			const token = authHeader.substring(7);
			try {
				const isValid = await verifyJWT(token, env.JWT_SECRET);
				if (!isValid) {
					return new Response('Unauthorized: Invalid JWT token', { status: 401 });
				}

				const payload = decodeJWT(token);
				if (!payload || !payload.payload) {
					return new Response('Unauthorized: Invalid JWT payload', { status: 401 });
				}

				// Extract user information from JWT payload
				const userPayload = payload.payload;
				const userId = userPayload._id || userPayload.subscriberId;
				const subscriberId = userPayload.subscriberId || userId;
				const { organizationId } = userPayload;
				const { environmentId } = userPayload;

				if (!userId || !subscriberId || !organizationId || !environmentId) {
					return new Response('Unauthorized: Missing required user information in JWT', { status: 401 });
				}

				// Create room ID based on organization, environment, and subscriber
				const roomId = `${organizationId}:${environmentId}:${subscriberId}`;

				// Get the Durable Object for this room
				const id = env.WEBSOCKET_ROOM.idFromName(roomId);
				const stub = env.WEBSOCKET_ROOM.get(id);

				// Forward the request to the Durable Object with user info
				const requestWithUserInfo = new Request(request.url, {
					method: request.method,
					headers: {
						...Object.fromEntries(request.headers.entries()),
						'X-User-Id': userId,
						'X-Subscriber-Id': userPayload.subscriberId || userId,
						'X-Organization-Id': organizationId,
						'X-Environment-Id': environmentId,
						'X-User-Email': userPayload.email || '',
						'X-User-Name': `${userPayload.firstName || ''} ${userPayload.lastName || ''}`.trim(),
					},
					body: request.body,
				});

				return stub.fetch(requestWithUserInfo);
			} catch (error) {
				console.error('JWT verification failed:', error);

				return new Response('Unauthorized: JWT verification failed', { status: 401 });
			}
		}

		// Handle HTTP API endpoints for sending messages
		if (url.pathname === '/api/send' && request.method === 'POST') {
			try {
				const { userId, event, data, organizationId, environmentId, subscriberId } = (await request.json()) as {
					userId: string;
					event: string;
					data: any;
					organizationId?: string;
					environmentId?: string;
					subscriberId?: string;
				};

				if (!userId || !event) {
					return new Response('Missing required fields: userId and event', { status: 400 });
				}

				/*
				 * Create room ID based on organization, environment, and subscriber if provided
				 * Fall back to global room if not provided for backward compatibility
				 */
				let roomId = 'global-room';
				if (organizationId && environmentId && subscriberId) {
					roomId = `${organizationId}:${environmentId}:${subscriberId}`;
				} else if (organizationId && environmentId) {
					// Fallback for backward compatibility - use userId as subscriberId
					roomId = `${organizationId}:${environmentId}:${userId}`;
				}

				console.log(`Routing message to room: ${roomId} for user: ${userId}, event: ${event}`);

				// Get the Durable Object instance for the appropriate room
				const id = env.WEBSOCKET_ROOM.idFromName(roomId);
				const stub = env.WEBSOCKET_ROOM.get(id);

				// Send message to the specific user
				await stub.sendToUser(userId, event, data);

				return new Response(JSON.stringify({ success: true, roomId }), {
					headers: { 'Content-Type': 'application/json' },
				});
			} catch (error) {
				console.error('Error sending message:', error);

				return new Response('Internal server error', { status: 500 });
			}
		}

		// Health check endpoint
		if (url.pathname === '/health') {
			return new Response('OK', { status: 200 });
		}

		return new Response('Not found', { status: 404 });
	},
} satisfies ExportedHandler<IEnv>;
