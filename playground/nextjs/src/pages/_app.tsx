import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { PagesClerkProvider } from '@/components/pages-clerk-provider';
import Layout from './layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <PagesClerkProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </PagesClerkProvider>
  );
}
