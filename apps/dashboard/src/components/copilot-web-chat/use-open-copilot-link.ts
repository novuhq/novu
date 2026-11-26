import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toDashboardPath } from './copilot-web-chat-utils';

/** Opens a dashboard link from a Copilot answer in the app. Returns false, opening nothing, for any other link. */
export function useOpenCopilotLink(): (url: string) => boolean {
  const navigate = useNavigate();

  return useCallback(
    (url: string) => {
      const path = toDashboardPath(url, window.location.origin);
      if (!path) return false;

      void navigate(path);

      return true;
    },
    [navigate]
  );
}
