import { css } from '@novu/novui/css';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { useEffect } from 'react';
import { Title, Text } from '@novu/novui';
import { VStack } from '@novu/novui/jsx';
import { SetupTimeline } from './components/SetupTimeline';
import { Wrapper } from './components/Wrapper';
import { ROUTES } from '../../constants/routes';
import { useNavigate } from 'react-router-dom';
import { useHealthCheck } from '../../studio/hooks/useBridgeAPI';
import { BridgeStatus } from '../../bridgeApi/bridgeApi.client';
import { useStudioState } from '../../studio/StudioStateProvider';
import { capitalizeFirstLetter } from '../../utils/string';
import { setNovuOnboardingStepCookie } from '../../utils';
import { useTelemetry } from '../../hooks/useNovuAPI';

const ONBOARDING_COOKIE_EXPIRY_DAYS = 10 * 365;

export const StudioOnboarding = () => {
  const track = useTelemetry();
  const navigate = useNavigate();
  const { testUser } = useStudioState();
  const { data, isLoading } = useHealthCheck();

  useEffect(() => {
    /**
     * User already onboarded to Novu and have more than one workflow
     */
    if (data?.discovered?.workflows && data?.discovered?.workflows > 1) {
      setNovuOnboardingStepCookie();
      navigate(ROUTES.STUDIO_FLOWS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  useEffect(() => {
    track('Add endpoint step started - [Onboarding - Signup]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const welcomeMessage = `Welcome ${capitalizeFirstLetter(testUser?.firstName || '')}`.trim() + `. Let's get started!`;

  return (
    <Wrapper>
      <Header />
      <VStack alignContent="center">
        <div
          className={css({
            width: 'onboarding',
          })}
        >
          <Title variant="page">{welcomeMessage}</Title>
          <Text
            variant="main"
            color="typography.text.secondary"
            className={css({
              marginBottom: '150',
              marginTop: '50',
            })}
          >
            Send your first email notification, by connecting to your Novu Bridge Endpoint. This setup will create a
            sample Next.js project with a pre-configured <code>@novu/framework</code>.
          </Text>
          <SetupTimeline testResponse={{ data: data as BridgeStatus, isLoading }} />
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
