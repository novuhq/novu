import { buildRoute, ROUTES } from '@/utils/routes';
import { useNavigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';

export const useTranslationsNavigate = () => {
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();

  const navigateToTranslationsFirstPage = () => {
    if (!currentEnvironment?.slug) return;

    navigate(buildRoute(ROUTES.TRANSLATIONS, { environmentSlug: currentEnvironment.slug }));
  };

  return {
    navigateToTranslationsFirstPage,
  };
};
