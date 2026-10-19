import type { Context, Next } from 'hono';

export async function authenticateInternalAPI(context: Context, next: Next) {
  const authHeader = context.req.header('Authorization');

  const providedKey = authHeader?.replace('Bearer ', '');

  if (!providedKey) {
    return context.json({ error: 'Unauthorized: Missing API key' }, 401);
  }

  const validApiKey = context.env.INTERNAL_API_KEY;
  if (!validApiKey) {
    console.error('INTERNAL_API_KEY environment variable not configured');

    return context.json({ error: 'Server configuration error' }, 500);
  }

  // Use constant-time comparison to prevent timing attacks
  if (!constantTimeEquals(providedKey, validApiKey)) {
    return context.json({ error: 'Unauthorized: Invalid API key' }, 401);
  }

  await next();
}

function constantTimeEquals(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
