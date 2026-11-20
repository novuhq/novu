import { getPublicAgentCard } from '@/lib/public-agent-card';
import { renderCardImage } from '@/lib/share-image';
import { publicShareImage } from '@/lib/share-image-data';

/** How long apps and browsers may keep the image: a renamed agent or a new channel shows up soon after. */
const CACHE_SECONDS = 600;

/**
 * The agent's card alone, as a picture: what ChatGPT and Claude show in the chat when the agent shows its card
 * (the MCP server's `agent_card` view). Always the new card, which the tool shows to every account. A card that
 * isn't public has no picture either.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const result = await getPublicAgentCard(handle);
  if (!result.available) {
    return new Response('This card isn’t available.', { status: 404 });
  }

  return renderCardImage(publicShareImage(result.card), { 'cache-control': `public, max-age=${CACHE_SECONDS}` });
}
