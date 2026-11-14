import type { Viewport } from 'next';

import { LandingShell } from '@/components/pages/channels/shared';
import { PricingComparison } from '@/components/pages/pricing/comparison';
import { PricingConversations } from '@/components/pages/pricing/conversations';
import { PricingFaq } from '@/components/pages/pricing/faq';
import { PricingHero } from '@/components/pages/pricing/hero';
import { PricingPlans } from '@/components/pages/pricing/plans';
import { SiteStructuredData } from '@/components/seo/site-structured-data';
import { PRICING_FAQ } from '@/data/pricing';
import { pageMetadata, SITE_ORIGIN } from '@/lib/seo';

export const metadata = pageMetadata('pricing');
export const viewport: Viewport = { themeColor: '#000000' };

export default function PricingPage() {
  return (
    <LandingShell>
      <SiteStructuredData
        page="pricing"
        nodes={[
          {
            '@type': 'FAQPage',
            '@id': `${SITE_ORIGIN}/pricing#faq`,
            isPartOf: { '@id': `${SITE_ORIGIN}/pricing#webpage` },
            mainEntity: PRICING_FAQ.map((item) => ({
              '@type': 'Question',
              name: item.question,
              acceptedAnswer: { '@type': 'Answer', text: item.answer },
            })),
          },
        ]}
      />
      <PricingHero />
      <PricingPlans />
      <PricingComparison />
      <PricingConversations />
      <PricingFaq />
    </LandingShell>
  );
}
