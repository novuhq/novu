import { setupMarkdown } from '@/lib/setup-md';
import { readApiUrl } from '@/lib/site-origin';

/**
 * What the channel drawers' prompts send an agent to ("Read agentinbox.md/setup.md"): how to connect Telegram,
 * Slack or WhatsApp, as Markdown. Read per request, so a local or staging site names its own API.
 */
export async function GET() {
  return new Response(setupMarkdown(await readApiUrl()), {
    headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
  });
}
