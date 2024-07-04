import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { parseUrl } from '../../utils/routeUtils';

export function useStudioNavigate() {
  const navigate = useNavigate();

  const navigateInStudio = useCallback(
    (to: string, params: Record<string, string>) => navigate(parseUrl(to, params)),
    [navigate]
  );

  return navigateInStudio;
}
