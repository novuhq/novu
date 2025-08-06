import jwt from '@tsndr/cloudflare-worker-jwt';
import type { Context, Next } from 'hono';

export async function verifyJWT(token: string, secret: string): Promise<boolean> {
  try {
    const result = await jwt.verify(token, secret);

    return !!result;
  } catch {
    return false;
  }
}

export function decodeJWT(token: string): any {
  try {
    return jwt.decode(token);
  } catch {
    return null;
  }
}

export async function authenticateJWT(context: Context, next: Next) {
  const token = context.req.query('token');

  if (!token) {
    return context.json({ error: 'Unauthorized: Missing token query parameter' }, 401);
  }

  try {
    const isValid = await verifyJWT(token, context.env.JWT_SECRET);
    if (!isValid) {
      return context.json({ error: 'Unauthorized: Invalid JWT token' }, 401);
    }

    const payload = decodeJWT(token);
    if (!payload || !payload.payload) {
      return context.json({ error: 'Unauthorized: Invalid JWT payload' }, 401);
    }

    // Extract user information from JWT payload
    const userPayload = payload.payload;
    const userId = userPayload._id;
    const subscriberId = userPayload.subscriberId || userId;
    const { organizationId, environmentId } = userPayload;

    if (!userId || !subscriberId || !organizationId || !environmentId) {
      return context.json({ error: 'Unauthorized: Missing required user information in JWT' }, 401);
    }

    // Store user info in context
    context.set('userPayload', userPayload);
    context.set('userId', userId);
    context.set('subscriberId', subscriberId);
    context.set('organizationId', organizationId);
    context.set('environmentId', environmentId);

    await next();
  } catch (error) {
    console.error('JWT verification failed:', error);

    return context.json({ error: 'Unauthorized: JWT verification failed' }, 401);
  }
}
