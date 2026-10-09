import { verifyWebhook } from '@clerk/nextjs/webhooks';
import type { NextRequest } from 'next/server';

import { ensureAccountForSignUp } from '@/lib/human-account';

const SIGN_UP_EVENT = 'user.created';

/**
 * Webhook of the Human Clerk app. A sign-up gets its account here, before the operator opens any page:
 * the backing organization (`POST /v1/human/accounts`). The agent comes later, from `human setup`.
 *
 * The signature is the only credential: Clerk signs every delivery with `CLERK_WEBHOOK_SIGNING_SECRET`.
 * Without that secret the endpoint answers 404, and the first dashboard visit does the same work instead.
 * A failure answers 500 on purpose, so Clerk delivers the event again later.
 */
export async function POST(request: NextRequest): Promise<Response> {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) {
    return new Response(null, { status: 404 });
  }

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(request);
  } catch {
    return new Response(null, { status: 401 });
  }

  if (event.type !== SIGN_UP_EVENT) {
    return Response.json({ handled: false });
  }

  try {
    await ensureAccountForSignUp(event.data.id);
  } catch (error) {
    console.error('Failed to set up the account of a new sign-up', error);

    return new Response(null, { status: 500 });
  }

  return Response.json({ handled: true });
}
