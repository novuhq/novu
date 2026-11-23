import type { Viewport } from 'next';
import Link from 'next/link';

import { LandingFaq } from '@/components/pages/channels/faq';
import { LandingShell } from '@/components/pages/channels/shared';
import { getStartedClass, UseCasesHero } from '@/components/pages/use-cases/hero';
import { UseCaseListing } from '@/components/pages/use-cases/listing';
import { UseCaseSetup } from '@/components/pages/use-cases/setup';
import { UseCaseGuardrails, UseCaseTeams } from '@/components/pages/use-cases/teams';
import { Closing } from '@/components/sapien/closing';
import { SiteStructuredData } from '@/components/seo/site-structured-data';
import { USE_CASE_FAQ } from '@/data/use-cases';
import { INBOX_PATH } from '@/lib/inbox';
import { pageMetadata, SITE_ORIGIN } from '@/lib/seo';
import { cn } from '@/lib/utils';

export const metadata = pageMetadata('useCases');
export const viewport: Viewport = { themeColor: '#000000' };

export default function UseCasesPage() {
  return (
    <LandingShell>
      <SiteStructuredData
        page="useCases"
        nodes={[
          {
            '@type': 'FAQPage',
            '@id': `${SITE_ORIGIN}/use-cases#faq`,
            isPartOf: { '@id': `${SITE_ORIGIN}/use-cases#webpage` },
            mainEntity: USE_CASE_FAQ.map(({ question, answer }) => ({
              '@type': 'Question',
              name: question,
              acceptedAnswer: { '@type': 'Answer', text: answer },
            })),
          },
        ]}
      />
      <UseCasesHero />
      <UseCaseListing />
      <UseCaseTeams />
      <UseCaseGuardrails />
      <UseCaseSetup />
      <LandingFaq items={USE_CASE_FAQ} highlightOpen />
      <Closing
        heading={{ lead: 'Give your agent', rest: 'an inbox.', accent: 'Today.' }}
        actions={
          <div className="grid grid-cols-2 gap-2">
            <Link href={INBOX_PATH} className={getStartedClass}>
              Get started
            </Link>
            <Link
              href="/"
              className={cn(getStartedClass, 'bg-sapien-surface px-2 text-sapien-foreground hover:bg-sapien-raised')}
            >
              Read the docs
            </Link>
          </div>
        }
      />
    </LandingShell>
  );
}
