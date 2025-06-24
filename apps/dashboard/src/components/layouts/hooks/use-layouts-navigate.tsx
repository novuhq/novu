import { buildRoute, ROUTES } from '@/utils/routes';
import { useNavigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';

export const useLayoutsNavigate = () => {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();

  const navigateToLayoutsFirstPage = () => {
    if (!currentEnvironment?.slug) return;

    navigate(buildRoute(ROUTES.LAYOUTS, { environmentSlug: currentEnvironment.slug }));
  };

  return {
    navigateToLayoutsFirstPage,
  };
};
