import { buildRoute, ROUTES } from '@/utils/routes';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';

export const useLayoutsNavigate = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { currentEnvironment } = useEnvironment();

  const navigateToLayoutsPage = () => {
    if (!currentEnvironment?.slug) return;

    navigate(`${buildRoute(ROUTES.LAYOUTS, { environmentSlug: currentEnvironment.slug })}${search}`);
  };

  return {
    navigateToLayoutsPage,
  };
};
