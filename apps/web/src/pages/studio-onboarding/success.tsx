import { Title, Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { VStack } from '@novu/novui/jsx';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { getActivityList } from '../../api/activity';
import { ExecutionDetailsAccordion } from '../../components/execution-detail/ExecutionDetailsAccordion';
import { useSegment } from '../../components/providers/SegmentProvider';
import { ROUTES } from '../../constants/routes';
import { Footer } from './components/Footer';
import { Header } from './components/Header';

export const StudioOnboardingSuccess = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const segment = useSegment();
  const navigate = useNavigate();
  const { data } = useQuery<{ data: any[]; hasMore: boolean; pageSize: number }>(
    ['activitiesList', 0, searchParams.get('transactionId')],
    () =>
      getActivityList(0, {
        transactionId: searchParams.get('transactionId'),
      }),
    {
      refetchOnMount: true,
    }
  );

  const item = useMemo(() => {
    if (!data) {
      return null;
    }

    return data.data.at(-1);
  }, [data]);

  const identifier = useMemo(() => {
    if (item === null) {
      return undefined;
    }

    return item?.trigger?.identifier;
  }, [item]);

  const email = useMemo(() => {
    if (item === null) {
      return null;
    }

    return item.subscriber.email;
  }, [item]);

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
          <Title variant="page">Success, you sent an email to {email}</Title>
          <Text
            variant="main"
            color="typography.text.secondary"
            className={css({
              marginTop: '50',
              marginBottom: '150',
            })}
          >
            Proceed to customize your Workflows or continue your onboarding by reviewing our documentation.
          </Text>
          <ExecutionDetailsAccordion identifier={identifier} steps={item?.jobs} subscriberVariables={{}} />
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
