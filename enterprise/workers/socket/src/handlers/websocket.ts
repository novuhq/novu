import type { Context } from 'hono';

export async function handleWebSocketUpgrade(context: Context) {
  const userId = context.get('userId');
  const subscriberId = context.get('subscriberId');
  const organizationId = context.get('organizationId');
  const environmentId = context.get('environmentId');
  const contextKeys = context.get('contextKeys') ?? [];

  // Extract JWT token from query parameter
  const jwtToken = context.req.query('token');

  const roomId = `${environmentId}:${userId}`;

  // Apply EU jurisdiction if REGION is set to "eu"
  const region = context.env.REGION;
  const namespace = region === 'eu' ? context.env.WEBSOCKET_ROOM.jurisdiction('eu') : context.env.WEBSOCKET_ROOM;

  const id = namespace.idFromName(roomId);
  const stub = namespace.get(id);

  // Forward the request to the Durable Object with user info and JWT token
  const requestWithUserInfo = new Request(context.req.raw.url, {
    method: context.req.method,
    headers: {
      ...Object.fromEntries(context.req.raw.headers.entries()),
      'X-User-Id': userId,
      'X-Subscriber-Id': subscriberId,
      'X-Organization-Id': organizationId,
      'X-Environment-Id': environmentId,
      'X-JWT-Token': jwtToken || '',
      'X-Context-Keys': JSON.stringify(contextKeys),
    },
    body: context.req.raw.body,
  });

  return stub.fetch(requestWithUserInfo);
}

// Send message handler - Protected by internal API key authentication
export async function handleSendMessage(context: Context) {
  try {
    const { userId, event, data, environmentId, contextKeys } = await context.req.json();

    // Validate required fields
    if (!userId || !event) {
      return context.json({ error: 'Missing required fields: userId and event' }, 400);
    }

    if (!environmentId) {
      return context.json({ error: 'Missing required field: environmentId' }, 400);
    }

    // Validate field types
    if (typeof userId !== 'string' || typeof event !== 'string' || typeof environmentId !== 'string') {
      return context.json({ error: 'Invalid field types: userId, event, and environmentId must be strings' }, 400);
    }

    // Ensure contextKeys is always an array (default to empty array if not provided)
    const safeContextKeys = contextKeys ?? [];

    // Create room ID based on environment and user
    const roomId = `${environmentId}:${userId}`;

    console.log(
      `[Internal API] Routing message to room: ${roomId} for user: ${userId}, event: ${event}, contextKeys: ${JSON.stringify(safeContextKeys)}`
    );

    /*
     * Get the Durable Object instance for the appropriate room
     * Apply EU jurisdiction if REGION is set to "eu"
     */
    const region = context.env.REGION;
    const namespace = region === 'eu' ? context.env.WEBSOCKET_ROOM.jurisdiction('eu') : context.env.WEBSOCKET_ROOM;

    const id = namespace.idFromName(roomId);
    const stub = namespace.get(id);

    context.executionCtx.waitUntil(stub.sendToUser(userId, event, data, safeContextKeys));

    return context.json({ success: true, roomId, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Error sending message:', error);

    return context.json({ error: 'Internal server error' }, 500);
  }
}
