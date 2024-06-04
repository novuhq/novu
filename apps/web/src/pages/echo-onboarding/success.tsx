import { css } from '@novu/novui/css';
import { vstack } from '@novu/novui/patterns';
import { ROUTES } from '@novu/shared-web';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getActivityList } from '../../api/activity';
import { ExecutionDetailsAccordion } from '../../components/execution-detail/ExecutionDetailsAccordion';
import { Footer } from './components/Footer';
import { Header } from './components/Header';

export const EchoOnboardingSuccess = () => {
  const { data, isLoading } = useQuery<{ data: any[]; hasMore: boolean; pageSize: number }>(['activitiesList', 0], () =>
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
            width: '880px',
          })}
        >
          <ExecutionDetailsAccordion identifier={identifier} steps={item?.jobs} subscriberVariables={{}} />
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
