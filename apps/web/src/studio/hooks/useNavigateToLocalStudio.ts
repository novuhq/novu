import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { LocalStudioWellKnownMetadata } from '../types';

const WELL_KNOWN_URL = 'http://localhost:2022/.well-known/novu';
const DEFAULT_STUDIO_PROTOCOL = 'http:';
const DEFAULT_STUDIO_HOST_NAME = 'localhost';
const DEFAULT_STUDIO_PORT = '2022';

type LocalStudioUrlParams = {
  protocol?: string;
  hostname?: string;
  port?: string;
};

const createLocalStudioUrl = ({ protocol, hostname, port }: LocalStudioUrlParams = {}) =>
  `${protocol || DEFAULT_STUDIO_PROTOCOL}//${hostname || DEFAULT_STUDIO_HOST_NAME}:${port || DEFAULT_STUDIO_PORT}`;

type UseNavigateToLocalStudio = {
  /** Invoked if "smart" navigation isn't available */
  fallbackFn?: () => void;
};

/**
 * Get response, and navigate to the appropriate Local Studio URL.
 * If no well-known response is available, open a modal.
 */
export const useNavigateToLocalStudio = ({ fallbackFn }: UseNavigateToLocalStudio = {}) => {
  const forceStudioNavigation = () => {
    window.open(createLocalStudioUrl(), '_self');
  };

  const { data, isError, isLoading } = useQuery<LocalStudioWellKnownMetadata>([WELL_KNOWN_URL], async () => {
    const response = await fetch(WELL_KNOWN_URL);

    return response.json();
  });

  const navigateToLocalStudio = useCallback(() => {
    if (isLoading) {
      return;
    }

    if (isError || !data) {
      fallbackFn?.();

      return;
    }

    window.open(createLocalStudioUrl({ port: data.studioPort }), '_self');
  }, [data, isError, isLoading]);

  return {
    data,
    isError,
    isLoading,
    navigateToLocalStudio,
    forceStudioNavigation,
  };
};
