import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

export const useIsStudio = () => {
  const { pathname } = useLocation();

  return useMemo(() => pathname.startsWith(ROUTES.STUDIO), [pathname]);
};
