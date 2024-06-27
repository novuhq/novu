import { css } from '@novu/novui/css';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { useEffect } from 'react';
import { Title, Text } from '@novu/novui';
import { VStack } from '@novu/novui/jsx';
import { SetupTimeline } from './components/SetupTimeline';
import { useSegment } from '../../components/providers/SegmentProvider';
import { Wrapper } from './components/Wrapper';
import { ROUTES } from '../../constants/routes';
import { useNavigate } from 'react-router-dom';
import { useBridgeUrlTest } from './useUrlTest';

export const StudioOnboarding = () => {
  const segment = useSegment();
  const navigate = useNavigate();
  const { runHealthCheck, isLoading, data } = useBridgeUrlTest();

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => runHealthCheck(), 500);

    return () => clearTimeout(delayDebounceFn);
  }, [runHealthCheck]);

  useEffect(() => {
    segment.track('Add endpoint step started - [Onboarding - Signup]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Wrapper>
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
          <SetupTimeline testResponse={{ data, isLoading }} />
        </div>
      </VStack>
      <Footer
        disabled={data?.status !== 'ok'}
        onClick={async () => {
          navigate(ROUTES.STUDIO_ONBOARDING_PREVIEW);
        }}
        loading={isLoading}
      />
    </Wrapper>
  );
};
