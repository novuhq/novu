import { useLocation } from 'react-router-dom';
import { type AppId, getAppIdFromPathname } from '@/utils/apps';

export function useCurrentApp(): AppId {
  const location = useLocation();

  return getAppIdFromPathname(location.pathname);
}
