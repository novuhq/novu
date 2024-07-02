import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const WELL_KNOWN_URL = 'http://localhost:2022/.well-known/novu';
const DEFAULT_STUDIO_URL = 'http://localhost:2022/studio';

type UseNavigateToLocalStudio = {
  /** Invoked if "smart" navigation isn't feasible */
  fallbackFn?: () => void;
};

/**
 * TODO: repeatedly getting CORS error since origin appears as :4200 when trying to access :2022
 *
 * Get response, and navigate to the appropriate Local Studio URL. If no well-known response is available,
 * open a modal.
 */
export const useNavigateToLocalStudio = ({ fallbackFn }: UseNavigateToLocalStudio = {}) => {
  const navigate = useNavigate();

  const forceStudioNavigation = () => {
    navigate(DEFAULT_STUDIO_URL);
  };

  const { data, isError, isLoading } = useQuery([WELL_KNOWN_URL], async () => {
    try {
      const response = await fetch(WELL_KNOWN_URL, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const resp = await response.json();

      return resp;
    } catch (err) {
      if (err instanceof Error) {
        console.error('Error fetching well-known file:', err.message);
      }
    }
  });

  const navigateToLocalStudio = useCallback(() => {
    if (isLoading) {
      return;
    }

    if (isError || !data) {
      fallbackFn?.();

      return;
    }
  }, [data, isError, isLoading]);

  return {
    data,
    isError,
    isLoading,
    navigateToLocalStudio,
    forceStudioNavigation,
  };
};
