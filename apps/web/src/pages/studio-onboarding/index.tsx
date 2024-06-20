import { css } from '@novu/novui/css';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { useEffect, useState } from 'react';
import { useEnvironment } from '../../hooks/useEnvironment';
import { Title, Text } from '@novu/novui';
import { VStack } from '@novu/novui/jsx';
import { SetupTimeline } from './components/SetupTimeline';
import { useSetupBridge } from './useSetupBridge';
import { useSegment } from '../../components/providers/SegmentProvider';
import * as mixpanel from 'mixpanel-browser';

export const StudioOnboarding = () => {
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string>('');
  const { loading, setup, testEndpoint, testResponse } = useSetupBridge(url, setError);
  const segment = useSegment();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => testEndpoint(url), 500);

    return () => clearTimeout(delayDebounceFn);
  }, [url, testEndpoint]);

  useEffect(() => {
    mixpanel.start_session_recording();
    segment.track('Add endpoint step started - [Onboarding - Signup]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function retest(continueSetup = false) {
    const result = await testEndpoint(url);

    if (continueSetup && result.data?.status === 'ok') {
      await setup();
    }
  }

  return (
    <div
      className={css({
        width: '100dvw',
        height: '100dvh',
        colorPalette: 'mode.cloud',
      })}
    >
      <Header />
      <VStack alignContent="center">
        <div
          className={css({
            width: 'onboarding',
          })}
        >
          <Title variant="page">Create an Novu endpoint</Title>
          <Text
            variant="main"
            color="typography.text.secondary"
            className={css({
              marginBottom: '150',
              marginTop: '50',
            })}
          >
            To start sending your first workflows, you first need to connect Novu to your Bridge Endpoint. This setup
            will create a sample Next.js project and pre-configured the @novu/framework client for you.
          </Text>
          <SetupTimeline error={error} url={url} setUrl={setUrl} testResponse={testResponse} retest={retest} />
        </div>
      </VStack>
      <Footer
        disabled={loading || !url}
        onClick={async () => {
          if (testResponse.data?.status === 'ok') {
            setup();
          } else {
            retest(true);
          }
        }}
        loading={loading}
      />
    </div>
  );
};
