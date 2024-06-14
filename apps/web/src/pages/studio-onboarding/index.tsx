import { css } from '@novu/novui/css';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { useEffect, useState } from 'react';
import { useEnvController } from '../../hooks/useEnvController';
import { Title, Text } from '@novu/novui';
import { VStack } from '@novu/novui/jsx';
import { SetupTimeline } from './components/SetupTimeline';
import { useSetupBridge } from './useSetupBridge';
import { useSegment } from '../../components/providers/SegmentProvider';

export const StudioOnboarding = () => {
  const { environment } = useEnvController();
  const [url, setUrl] = useState('http://localhost:9999/api/echo');
  const [error, setError] = useState<string>('');
  const { loading, setup } = useSetupBridge(url, setError);
  const segment = useSegment();

  useEffect(() => {
    segment.track('Add endpoint step started - [Onboarding - Signup]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!environment?.echo?.url) {
      return;
    }
    setUrl(environment?.echo?.url);
  }, [environment?.echo?.url]);

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
          <SetupTimeline error={error} url={url} setUrl={setUrl} isLoading={loading} />
        </div>
      </VStack>
      <Footer
        onClick={() => {
          setup();
        }}
        loading={loading}
      />
    </div>
  );
};
