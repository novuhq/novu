import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { LocalStudioWellKnownMetadata } from '../types';

const WELL_KNOWN_URL = 'http://localhost:2022/.well-known/novu';
const DEFAULT_STUDIO_PROTOCOL = 'http:';
const DEFAULT_STUDIO_HOST_NAME = 'localhost';
const DEFAULT_STUDIO_PORT = '2022';

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
    // use default URL
    navigateToLocalStudioUrl();
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

    navigateToLocalStudioUrl({ port: data.studioPort });
  }, [data, isError, isLoading, fallbackFn]);

  return {
    data,
    isError,
    isLoading,
    navigateToLocalStudio,
    forceStudioNavigation,
  };
};

type LocalStudioUrlParams = {
  protocol?: string;
  hostname?: string;
  port?: string;
};

function navigateToLocalStudioUrl({ protocol, hostname, port }: LocalStudioUrlParams = {}) {
  const url = `${protocol || DEFAULT_STUDIO_PROTOCOL}//${hostname || DEFAULT_STUDIO_HOST_NAME}:${
    port || DEFAULT_STUDIO_PORT
  }`;

  /**
   * NOTE: this fails after 1 invocation if opening in the same tab, so _blank is required!
   * It seems it may be due to the loading of the iFrame: https://stackoverflow.com/a/13459106
   */
  window.open(url, '_blank');
}
