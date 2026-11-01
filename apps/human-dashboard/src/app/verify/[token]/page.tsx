import type { Metadata, Viewport } from 'next';

import { VerifyPage } from '@/components/verify/verify-page';
import { API_PROXY_PATH } from '@/lib/novu-api';

export const metadata: Metadata = {
  title: 'Confirm email',
  robots: { index: false, follow: false },
  referrer: 'origin',
};

export const viewport: Viewport = {
  themeColor: '#f5f3ef',
};

export default async function Page(props: PageProps<'/verify/[token]'>) {
  const { token } = await props.params;

  return <VerifyPage apiUrl={API_PROXY_PATH} token={token} />;
}
