import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { useEffect, useState } from 'react';
import { PagesClerkProvider } from '@/components/pages-clerk-provider';
import { type NovuConfig, novuConfig } from '@/utils/config';
import Layout from './layout';

export default function App({ Component, pageProps }: AppProps) {
  const [configured, setConfigured] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const subscriberId = new URLSearchParams(window.location.search).get('subscriberId');
    const query = subscriberId ? `?${new URLSearchParams({ subscriberId })}` : '';
    fetch(`/api/novu-config${query}`)
      .then((res) => {
        if (!res.ok) throw new Error(`/api/novu-config answered ${res.status}`);

        return res.json();
      })
      .then((config: Partial<NovuConfig>) => {
        Object.assign(novuConfig, config);
        setConfigured(true);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <PagesClerkProvider>
      <Layout>
        {error && <p>Couldn&apos;t load the Novu config: {error}</p>}
        {configured && <Component {...pageProps} />}
      </Layout>
    </PagesClerkProvider>
  );
}
