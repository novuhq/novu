import { getPublicAgentCard } from '@/lib/public-agent-card';
import { renderShareImage, SHARE_IMAGE_SIZE } from '@/lib/share-image';
import { publicShareImage } from '@/lib/share-image-data';

export const alt = 'An agent’s card on agentinbox.md';

export const size = SHARE_IMAGE_SIZE;

export const contentType = 'image/png';

/** How long apps and browsers may keep the image: a renamed agent or a new channel shows up soon after. */
const CACHE_SECONDS = 600;

/**
 * The image apps show where a card's link is shared: the public card, drawn as the Share dialog previews
 * it. A card that isn't available has no image either.
 */
export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const result = await getPublicAgentCard(handle);
  if (!result.available) {
    return new Response('This card isn’t available.', { status: 404 });
  }

  return renderShareImage(publicShareImage(result.card), { 'cache-control': `public, max-age=${CACHE_SECONDS}` });
}
