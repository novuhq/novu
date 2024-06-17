import { Skeleton } from '@mantine/core';
import { Mail } from '@novu/design-system';
import { Title, Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { HStack, VStack } from '@novu/novui/jsx';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getActivityList } from '../../api/activity';
import { ExecutionDetailsAccordion } from '../../components/execution-detail/ExecutionDetailsAccordion';
import { useSegment } from '../../components/providers/SegmentProvider';
import { When } from '../../components/utils/When';
import { ROUTES } from '../../constants/routes';
import { Footer } from './components/Footer';
import { Header } from './components/Header';

export const StudioOnboardingSuccess = () => {
  const [searchParams] = useSearchParams();
  const segment = useSegment();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery<{ data: any[]; hasMore: boolean; pageSize: number }>(
    ['activitiesList', 0, searchParams.get('transactionId')],
    () =>
      getActivityList(0, {
        transactionId: searchParams.get('transactionId'),
      }),
    {
      refetchOnMount: true,
      refetchInterval: 500,
    }
  );

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
    segment.track('Test workflow step completed - [Onboarding - Signup]');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={css({
        width: '100dvw',
        height: '100dvh',
      })}
    >
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
          segment.track('Workflows page accessed - [Onboarding - Signup]');
          navigate(ROUTES.WORKFLOWS);
        }}
        canSkipSetup={false}
        buttonText="Explore workflows"
        showLearnMore={false}
      />
    </div>
  );
};
