import { useLocation } from 'react-router-dom';
import { type AppId, getCurrentAppId } from '@/utils/apps';

export function useCurrentApp(): AppId {
  const location = useLocation();

  return getCurrentAppId(location.pathname);
}
