import type { Viewport } from 'next';

import { BuildingBlocks } from '@/components/sapien/building-blocks';
import { Closing } from '@/components/sapien/closing';
import { Faq } from '@/components/sapien/faq';
import { Hero } from '@/components/sapien/hero';
import { InboxSection } from '@/components/sapien/inbox';
import { Integrations } from '@/components/sapien/integrations';
import { LogoCloud } from '@/components/sapien/logo-cloud';
import { Scale } from '@/components/sapien/scale';
import { Security } from '@/components/sapien/security';
import { SiteFooter } from '@/components/sapien/site-footer';
import { SiteHeader } from '@/components/sapien/site-header';
import { UseCases } from '@/components/sapien/use-cases';
import { SiteStructuredData } from '@/components/seo/site-structured-data';
import { inter, ivyPresto } from '@/lib/sapien-fonts';
import { pageMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';

export const metadata = pageMetadata('sapien');

export const viewport: Viewport = {
  themeColor: '#000000',
};

/** agentinbox.md for people (agents read `/`), in its own black, Inter and IvyPresto. */
export default function SapienPage() {
  return (
    <div
      className={cn(
        inter.variable,
        ivyPresto.variable,
        'sapien-page min-h-dvh overflow-x-clip bg-sapien-background font-sapien-sans text-sapien-foreground'
      )}
    >
      <SiteStructuredData page="sapien" />
      {/* Mobile Figma frames keep a 10px gutter (340px canvas at 360px). */}
      <div className="mx-auto w-[calc(100%-20px)] max-w-240 sm:w-[calc(100%-2rem)]">
        <SiteHeader />
        <main>
          <Hero />
          <LogoCloud />
          <InboxSection />
          <BuildingBlocks />
          <UseCases />
          <Integrations />
          <Scale />
          <Security />
          <Faq />
          <Closing />
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
