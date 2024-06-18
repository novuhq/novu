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
import { useWindowEvent } from '@mantine/hooks';

export const StudioOnboarding = () => {
  const { environment } = useEnvironment();
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string>('');
  const { loading, setup, testEndpoint, testResponse } = useSetupBridge(url, setError);
  const segment = useSegment();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => testEndpoint(url), 500);

    return () => clearTimeout(delayDebounceFn);
  }, [url, testEndpoint]);

  useEffect(() => {
    segment.track('Add endpoint step started - [Onboarding - Signup]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useWindowEvent('focus', () => {
    testEndpoint(url);
  });

  useEffect(() => {
    if (!environment?.echo?.url) {
      return;
    }
    setUrl(environment?.echo?.url);
  }, [environment?.echo?.url]);

  function retest() {
    testEndpoint(url);
  }

  return (
    <div
      className={css({
        width: '100dvw',
        height: '100dvh',
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
            The first step adds an Novu endpoint, and creates your first workflow automatically. The workflow will be
            created with an email step with sample content.
          </Text>
          <SetupTimeline error={error} url={url} setUrl={setUrl} testResponse={testResponse} retest={retest} />
        </div>
      </VStack>
      <Footer
        disabled={testResponse.data?.status !== 'ok'}
        onClick={() => {
          setup();
        }}
        loading={loading}
      />
    </div>
  );
};
