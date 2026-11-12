import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { PagesClerkProvider } from '@/components/pages-clerk-provider';
import { type NovuConfig, novuConfig } from '@/utils/config';
import Layout from './layout';

export default function App({ Component, pageProps }: AppProps) {
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const subscriberId = new URLSearchParams(window.location.search).get('subscriberId');
    const query = subscriberId ? `?${new URLSearchParams({ subscriberId })}` : '';
    fetch(`/api/novu-config${query}`)
      .then((res) => res.json())
      .then((config: Partial<NovuConfig>) => Object.assign(novuConfig, config))
      .finally(() => setConfigured(true));
  }, []);

  return (
    <PagesClerkProvider>
      <Layout>{configured && <Component {...pageProps} />}</Layout>
    </PagesClerkProvider>
  );
}
