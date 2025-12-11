import { vValidator } from '@hono/valibot-validator';
import type { Context } from 'hono';
import { Hono } from 'hono';
import { authMiddleware } from './auth';
import { Scheduler } from './scheduler';
import { ScheduleJobRequestSchema } from './types';

type Bindings = Env;

const app = new Hono<{ Bindings: Bindings }>();

function forwardToScheduler(c: Context<{ Bindings: Bindings }>, jobId: string, action: string, body?: unknown) {
  const id = c.env.SCHEDULER.idFromName(jobId);
  const stub = c.env.SCHEDULER.get(id);

  const headers = new Headers({ 'X-Action': action });
  const options: RequestInit = { headers };

  if (body) {
    headers.set('Content-Type', 'application/json');
    options.body = JSON.stringify(body);
    options.method = 'POST';
  } else {
    options.method = 'DELETE';
  }

  const req = new Request(c.req.raw.url, options);

  return stub.fetch(req);
}

app.get('/health', (c) => {
  return c.text('OK');
});

app.post('/schedule', authMiddleware, vValidator('json', ScheduleJobRequestSchema), async (c) => {
  const body = c.req.valid('json');

  return forwardToScheduler(c, body.jobId, 'schedule', body);
});

app.delete('/cancel/:jobId', authMiddleware, async (c) => {
  const jobId = c.req.param('jobId');

  if (!jobId) {
    return c.json({ error: 'jobId is required' }, 400);
  }

  return forwardToScheduler(c, jobId, 'cancel');
});

export default {
  fetch: app.fetch,
};

export { Scheduler };
