import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { buildRoute, ROUTES } from '@/utils/routes';

export const useSubscribersNavigate = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  const navigateToSubscribersCurrentPage = useCallback(() => {
    navigate(
      `${buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment?.slug ?? '' })}${location.search}`
    );
  }, [location.search, navigate, currentEnvironment?.slug]);

  const navigateToEditSubscriberPage = useCallback(
    (subscriberId: string) => {
      navigate(
        `${buildRoute(ROUTES.EDIT_SUBSCRIBER, {
          environmentSlug: currentEnvironment?.slug ?? '',
          subscriberId: encodeURIComponent(subscriberId),
        })}${location.search}`
      );
    },
    [location.search, navigate, currentEnvironment?.slug]
  );

  const navigateToCreateSubscriberPage = useCallback(() => {
    navigate(
      `${buildRoute(ROUTES.CREATE_SUBSCRIBER, { environmentSlug: currentEnvironment?.slug || '' })}${location.search}`
    );
  }, [location.search, navigate, currentEnvironment?.slug]);

  const navigateToSubscribersFirstPage = useCallback(() => {
    const newParams = new URLSearchParams(location.search);
    const hasAfter = newParams.has('after');
    const hasBefore = newParams.has('before');
    const hasIncludeCursor = newParams.has('includeCursor');

    if (hasAfter || hasBefore || hasIncludeCursor) {
      newParams.delete('after');
      newParams.delete('before');
      newParams.delete('includeCursor');

      // reset the query to trigger a subscribers table loading state
      queryClient.resetQueries({
        queryKey: [QueryKeys.fetchSubscribers],
      });
    }

    navigate(`${buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment?.slug ?? '' })}?${newParams}`, {
      replace: true,
    });
  }, [queryClient, location.search, navigate, currentEnvironment?.slug]);

  return {
    navigateToSubscribersCurrentPage,
    navigateToEditSubscriberPage,
    navigateToCreateSubscriberPage,
    navigateToSubscribersFirstPage,
  };
};
