import { Title, Text } from '@novu/novui';
import { css } from '@novu/novui/css';
import { VStack } from '@novu/novui/jsx';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActivityList } from '../../api/activity';
import { ExecutionDetailsAccordion } from '../../components/execution-detail/ExecutionDetailsAccordion';
import { ROUTES } from '../../constants/routes';
import { Footer } from './components/Footer';
import { Header } from './components/Header';

export const StudioOnboardingSuccess = () => {
  const { data } = useQuery<{ data: any[]; hasMore: boolean; pageSize: number }>(['activitiesList', 0], () =>
    getActivityList(0, undefined)
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

  const navigate = useNavigate();

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
          <Title variant="section">Success, you sent an email to {email}</Title>
          <Text
            variant="secondary"
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
          navigate(ROUTES.WORKFLOWS);
        }}
        canSkipSetup={false}
        buttonText="Explore workflows"
        showLearnMore={false}
      />
    </div>
  );
};
