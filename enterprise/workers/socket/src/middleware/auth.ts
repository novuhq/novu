import jwt from '@tsndr/cloudflare-worker-jwt';
import type { Context, Next } from 'hono';

// Other tokens signed with JWT_SECRET, such as Community dashboard user tokens, carry no audience
const SUBSCRIBER_SESSION_AUDIENCE = 'widget_user';

interface ISubscriberSessionPayload {
  _id?: string;
  subscriberId?: string;
  organizationId?: string;
  environmentId?: string;
  contextKeys?: string[];
}

export async function authenticateJWT(context: Context, next: Next) {
  const token = context.req.query('token');

  if (!token) {
    return context.json({ error: 'Unauthorized: Missing token query parameter' }, 401);
  }

  try {
    // verify() throws instead of returning undefined when the token cannot be decoded
    const verified = await jwt.verify<ISubscriberSessionPayload>(token, context.env.JWT_SECRET).catch(() => undefined);
    if (!verified) {
      return context.json({ error: 'Unauthorized: Invalid JWT token' }, 401);
    }

    const userPayload = verified.payload;
    if (!userPayload || userPayload.aud !== SUBSCRIBER_SESSION_AUDIENCE) {
      return context.json({ error: 'Unauthorized: Invalid JWT payload' }, 401);
    }

    const { _id: userId, subscriberId, organizationId, environmentId, contextKeys } = userPayload;

    if (!userId || !subscriberId || !organizationId || !environmentId) {
      return context.json({ error: 'Unauthorized: Missing required user information in JWT' }, 401);
    }

    // Store user info in context
    context.set('userPayload', userPayload);
    context.set('userId', userId);
    context.set('subscriberId', subscriberId);
    context.set('organizationId', organizationId);
    context.set('environmentId', environmentId);
    context.set('contextKeys', contextKeys);

    await next();
  } catch (error) {
    console.error('JWT verification failed:', error);

    return context.json({ error: 'Unauthorized: JWT verification failed' }, 401);
  }
}
