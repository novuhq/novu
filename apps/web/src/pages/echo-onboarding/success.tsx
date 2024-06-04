import { css } from '@novu/novui/css';
import { vstack } from '@novu/novui/patterns';
import { ROUTES } from '@novu/shared-web';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActivityList, getNotification } from '../../api/activity';
import { ExecutionDetailsAccordion } from '../../components/execution-detail/ExecutionDetailsAccordion';
import { Footer } from './components/Footer';
import { Header } from './components/Header';

export const EchoOnboardingSuccess = () => {
  const [notificationId, setNotificationId] = useState<string>('');
  const { data, isLoading } = useQuery<{ data: any[]; hasMore: boolean; pageSize: number }>(['activitiesList', 0], () =>
    getActivityList(0, undefined)
  );

  console.log(data);

  const { data: response, isInitialLoading } = useQuery(
    ['activity', notificationId],
    () => getNotification(notificationId),
    {
      enabled: notificationId.length > 0,
      refetchInterval: false,
    }
  );
  const navigate = useNavigate();

  return (
    <div
      className={css({
        width: '100dvw',
        height: '100dvh',
      })}
    >
      <Header active={2} />
      <div className={vstack({ alignContent: 'center' })}>
        <div
          className={css({
            width: '680px',
          })}
        >
          <ExecutionDetailsAccordion identifier={undefined} steps={undefined} subscriberVariables={{}} />
        </div>
      </div>
      <Footer
        onClick={() => {
          navigate(ROUTES.WORKFLOWS);
        }}
        canSkipSetup={false}
        buttonText="Explore workflows"
      />
    </div>
  );
};
