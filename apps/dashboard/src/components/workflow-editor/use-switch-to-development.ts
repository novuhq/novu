import { useNavigate } from 'react-router-dom';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

/**
 * Workflows are authored in development and promoted to live environments, so every view-only
 * surface offers the same escape hatch: switch environments and reopen the same workflow there.
 */
export const useSwitchToDevelopment = (workflowId?: string) => {
  const { switchEnvironment, oppositeEnvironment } = useEnvironment();
  const navigate = useNavigate();
  const developmentEnvironment = oppositeEnvironment?.name === 'Development' ? oppositeEnvironment : null;

  const switchToDevelopment = () => {
    if (!developmentEnvironment?.slug || !workflowId) {
      return;
    }

    switchEnvironment(developmentEnvironment.slug);
    void navigate(
      buildRoute(ROUTES.EDIT_WORKFLOW, {
        environmentSlug: developmentEnvironment.slug,
        workflowSlug: workflowId,
      })
    );
  };

  return { developmentEnvironment, switchToDevelopment };
};
