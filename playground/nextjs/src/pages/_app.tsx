import '@/styles/globals.css';
import { novuConfig } from '@/utils/config';
import { NovuProvider } from '@novu/react';
import type { AppProps } from 'next/app';
import Layout from './layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <NovuProvider {...novuConfig}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </NovuProvider>
  );
}
