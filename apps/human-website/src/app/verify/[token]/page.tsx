import type { Metadata } from 'next';

import { SiteFrame } from '@/components/site/site-frame';
import { VerifyPage } from '@/components/verify/verify-page';
import { resolveNovuApiUrl } from '@/lib/novu-api';

export const metadata: Metadata = {
  title: 'Verify email',
  robots: { index: false, follow: false },
  referrer: 'origin',
};

export default async function Page(props: PageProps<'/verify/[token]'>) {
  const { token } = await props.params;
  const { region } = await props.searchParams;

  return (
    <SiteFrame className="px-4 py-14 md:px-8 md:py-20">
      <VerifyPage apiUrl={resolveNovuApiUrl(region)} token={token} />
    </SiteFrame>
  );
}
