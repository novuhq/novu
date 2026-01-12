import type { Context, Next } from 'hono';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next): Promise<Response | void> {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token || !c.env.API_KEY || token !== c.env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  await next();
}
