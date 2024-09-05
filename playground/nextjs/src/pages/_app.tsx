import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import Layout from './layout';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
