import { getNovuAgent } from '@/lib/novu/agent';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleNovuWebhook(req: Request): Promise<Response> {
  try {
    const { novu } = await getNovuAgent();

    return novu.handleWebhook(req);
  } catch {
    return new Response(null, { status: 500 });
  }
}

export const GET = handleNovuWebhook;
export const POST = handleNovuWebhook;
