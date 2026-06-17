import { getNovuAgent } from "@/lib/novu/agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handleNovuWebhook(req: Request): Promise<Response> {
  const { novu } = await getNovuAgent();

  return novu.handleWebhook(req);
}

export const GET = handleNovuWebhook;
export const POST = handleNovuWebhook;
