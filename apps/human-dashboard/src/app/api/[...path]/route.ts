import { forwardToNovuApi } from '@/lib/api-proxy';

/**
 * Agent Inbox's way to the Novu API (`lib/api-proxy.ts`): the CLI goes to `https://www.agentinbox.md/api` by
 * default, and the invite, verify and connect pages call `/api` from the browser. `/api/webhooks/clerk` keeps
 * its own route.
 *
 * The longest call is the inbox's long-poll, which the API holds for up to 25 seconds; a minute leaves room for
 * it on every Vercel plan.
 */
export const maxDuration = 60;

export const GET = forwardToNovuApi;
export const POST = forwardToNovuApi;
export const PUT = forwardToNovuApi;
export const PATCH = forwardToNovuApi;
export const DELETE = forwardToNovuApi;
