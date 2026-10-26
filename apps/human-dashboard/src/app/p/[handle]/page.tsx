import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { PublicCardPage } from '@/components/public-card/public-card-page';
import { Toaster } from '@/components/ui/toast';
import { getPublicAgentCard } from '@/lib/public-agent-card';
import { readSiteOrigin } from '@/lib/site-origin';

export async function generateMetadata(props: PageProps<'/p/[handle]'>): Promise<Metadata> {
  const { handle } = await props.params;
  const result = await getPublicAgentCard(handle);
  // The share image's address is made from this, so apps the link is shared in can load it.
  const metadataBase = new URL(await readSiteOrigin());
  if (!result.available) {
    return { metadataBase, title: 'Card not available', robots: { index: false, follow: false } };
  }

  const { card } = result;
  const title = `${card.name}’s card`;
  const description = `One link with every way to reach ${card.handle}.`;

  return {
    metadataBase,
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, url: card.cardLink },
    twitter: { card: 'summary_large_image', title, description },
  };
}

/**
 * An agent's public card, at `/p/{handle}` on the dashboard's site (`readSiteOrigin`): anyone with the link
 * sees the card and every way to reach the agent, without signing in (`PublicCardPage`). Only what the page
 * shows comes to it (`PublicAgentCard`). A card that isn't available, for whatever reason, shows
 * `not-found.tsx` instead.
 */
export default async function Page(props: PageProps<'/p/[handle]'>) {
  const { handle } = await props.params;
  const result = await getPublicAgentCard(handle);
  if (!result.available) {
    notFound();
  }

  return (
    <>
      <PublicCardPage card={result.card} />
      {/* Where a copy or a save that the browser refused says so. */}
      <Toaster />
    </>
  );
}
