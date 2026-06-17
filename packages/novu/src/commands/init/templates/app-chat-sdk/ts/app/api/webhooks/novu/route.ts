import { getNovuAgent } from '@/lib/novu/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
      ? 'Point your Novu agent bridge URL at POST /api/webhooks/novu'
      : 'Set NOVU_SECRET_KEY and NOVU_AGENT_IDENTIFIER in .env.local',
  });
}
