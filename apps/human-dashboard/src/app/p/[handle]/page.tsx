import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicCard } from '@/components/public-card/public-card';
import { Stage } from '@/components/site/stage';
import { getPublicAgentCard } from '@/lib/public-agent-card';

export async function generateMetadata(props: PageProps<'/p/[handle]'>): Promise<Metadata> {
  const { handle } = await props.params;
  const result = await getPublicAgentCard(handle);
  if (!result.available) {
    return { title: 'Card not available', robots: { index: false, follow: false } };
  }

  const { card } = result;
  const title = `${card.name}’s card`;
  const description = `One link with every way to reach ${card.handle}.`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, url: card.cardLink },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/**
 * An agent's public card, at `/p/{handle}` on the dashboard's site (`readSiteOrigin`): anyone with the link
 * sees it, without signing in. Only what the card shows comes to the page (`PublicAgentCard`). A card that
 * isn't available, for whatever reason, shows `not-found.tsx` instead.
 */
export default async function Page(props: PageProps<'/p/[handle]'>) {
  const { handle } = await props.params;
  const result = await getPublicAgentCard(handle);
  if (!result.available) {
    notFound();
  }

  return (
    <Stage glow="center">
      <PublicCard card={result.card} />
    </Stage>
  );
}
