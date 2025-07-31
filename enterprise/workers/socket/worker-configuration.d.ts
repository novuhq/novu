/**
 * Cloudflare Workers type augmentation for socket worker
 *
 * This file extends the base Cloudflare Workers types with custom environment bindings.
 * The base types are provided by @cloudflare/workers-types package.
 */

declare namespace Cloudflare {
	interface Env {
		/**
		 * Durable Object namespace for WebSocket rooms
		 */
		WEBSOCKET_ROOM: DurableObjectNamespace<import('./src/index').WebSocketRoom>;

		/**
		 * JWT secret for authentication
		 */
		JWT_SECRET: string;
	}
}
