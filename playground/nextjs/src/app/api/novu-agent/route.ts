import { getNovuAgent } from './agent';

// node:crypto + dynamic import('chat') require the Node.js runtime (not edge).
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Live bridge endpoint. Point a Novu agent's bridge URL (or `devBridgeUrl` via a
 * tunnel) at this route: `https://<host>/api/novu-agent`. Novu POSTs a signed
 * `AgentBridgeRequest` here for every inbound message/action/reaction across all
 * connected channels; the adapter verifies the HMAC and dispatches to the
 * handlers in `agent.ts`.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const { novu } = await getNovuAgent();

    return await novu.handleWebhook(req);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : 'Bridge error' }, { status: 500 });
  }
}

export async function GET(): Promise<Response> {
  const configured = Boolean(process.env.NOVU_SECRET_KEY && process.env.NOVU_AGENT_IDENTIFIER);

  return Response.json({
    ok: true,
    configured,
    hint: configured
      ? 'Point your Novu agent bridge URL at POST /api/novu-agent'
      : 'Set NOVU_SECRET_KEY and NOVU_AGENT_IDENTIFIER to enable the live bridge',
  });
}
