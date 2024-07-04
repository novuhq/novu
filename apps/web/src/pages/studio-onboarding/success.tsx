import { Skeleton } from '@mantine/core';
import { Mail } from '@novu/design-system';
import { Title, Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { HStack, VStack } from '@novu/novui/jsx';
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ExecutionDetailsAccordion } from '../../components/execution-detail/ExecutionDetailsAccordion';
import { When } from '../../components/utils/When';
import { ROUTES } from '../../constants/routes';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { Wrapper } from './components/Wrapper';
import { setNovuOnboardingStepCookie } from '../../utils';
import { useNotifications, useTelemetry } from '../../hooks/useNovuAPI';

const ONBOARDING_COOKIE_EXPIRY_DAYS = 10 * 365;

export const StudioOnboardingSuccess = () => {
  const [searchParams] = useSearchParams();
  const track = useTelemetry();
  const navigate = useNavigate();
  const transactionId = searchParams.get('transactionId') || '';
  const { data, isLoading } = useNotifications(transactionId, {
    enabled: !!transactionId,
    refetchOnMount: true,
    refetchInterval: 500,
  });

  const item = useMemo(() => {
    if (!data) {
      return null;
    }

    return data.data.at(-1);
  }, [data]);

  const identifier = useMemo(() => {
    if (!item) {
      return undefined;
    }

    return item?.trigger?.identifier;
  }, [item]);

  const email = useMemo(() => {
    if (item === null) {
      return null;
    }

    return item?.subscriber?.email;
  }, [item]);

  const stepId = useMemo(() => {
    if (!item?.jobs) {
      return undefined;
    }

    return item.jobs[0]?.id;
  }, [item?.jobs]);

  useEffect(() => {
    track('Test workflow step completed - [Onboarding - Signup]');

    setNovuOnboardingStepCookie();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Wrapper>
      <Header activeStepIndex={3} />
      <VStack alignContent="center">
        <div
          className={css({
            width: 'onboarding',
          })}
        >
          <Title variant="page">Success! You sent an email to {email}</Title>
          <Text
            variant="main"
            color="typography.text.secondary"
            className={css({
              marginTop: '50',
              marginBottom: '150',
            })}
          >
            Check your inbox for the e-mail you've just sent. Proceed to customize your Workflows or continue your
            onboarding by reviewing our documentation.
          </Text>
          <When truthy={!isLoading}>
            <ExecutionDetailsAccordion
              identifier={identifier}
              defaultOpen={stepId}
              steps={item?.jobs}
              subscriberVariables={{}}
            />
          </When>
          <When truthy={isLoading}>
            <div
              className={css({
                border: 'solid',
                borderColor: 'typography.text.secondary',
                borderRadius: '50',
                padding: '100',
                background: 'surface.page',
              })}
            >
              <HStack
                gap="150"
                className={css({
                  padding: '50',
                })}
              >
                <Mail
                  className={css({
                    width: '200',
                    height: '200',
                    color: 'typography.text.secondary',
                  })}
                />
                <VStack
                  className={css({
                    flex: 1,
                    alignItems: 'start',
                  })}
                  gap="25"
                >
                  <Skeleton height={16} width="10%" radius="sm" />
                  <Skeleton height={12} width="25%" radius="sm" />
                  <Skeleton height={12} width="15%" radius="sm" />
                </VStack>
              </HStack>
            </div>
          </When>
        </div>
      </VStack>
      <Footer
        onClick={() => {
          track('Workflows page accessed - [Onboarding - Signup]');
          navigate(ROUTES.STUDIO_FLOWS);
        }}
        buttonText="Explore workflows"
        showLearnMore={false}
      />
    </Wrapper>
  );
};
