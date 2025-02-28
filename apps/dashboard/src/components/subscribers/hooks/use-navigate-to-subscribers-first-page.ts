import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import { useEnvironment } from '@/context/environment/hooks';
import { ROUTES } from '@/utils/routes';
import { buildRoute } from '@/utils/routes';
import { QueryKeys } from '@/utils/query-keys';

export const useNavigateToSubscribersFirstPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentEnvironment } = useEnvironment();

  return useCallback(() => {
    const newParams = new URLSearchParams(location.search);
    const hasAfter = newParams.has('after');
    const hasBefore = newParams.has('before');

    if (hasAfter || hasBefore) {
      newParams.delete('after');
      newParams.delete('before');

      // reset the query to trigger a subscriberstable loading state
      queryClient.resetQueries({
        queryKey: [QueryKeys.fetchSubscribers],
      });
    }

    navigate(`${buildRoute(ROUTES.SUBSCRIBERS, { environmentSlug: currentEnvironment?.slug ?? '' })}?${newParams}`, {
      replace: true,
    });
  }, [queryClient, location.search, navigate, currentEnvironment?.slug]);
};
