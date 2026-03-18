# WebSocket Service

Real-time WebSocket service for delivering live updates to connected clients (e.g., in-app notification inbox).

## Stack

- **Framework**: NestJS
- **Transport**: Socket.io with Redis adapter (for horizontal scaling)

## Running

```bash
pnpm start:ws
```

This service is rarely needed for typical development. Start it only when working on real-time features (e.g., live inbox updates, read/unread status sync).

## Key Directories

```
apps/ws/src/   # Socket gateways, guards, and event handlers
```

## Architecture Notes

- Clients authenticate via JWT on the Socket.io handshake.
- The Redis adapter allows multiple ws instances to share socket state — required in production.
- Events emitted here are consumed by the `@novu/js` and `@novu/react` packages on the client side.
- New Socket.io event types require matching updates in `@novu/js` and `@novu/react`.

<!-- Monorepo-wide boundaries: see root AGENTS.md -->
