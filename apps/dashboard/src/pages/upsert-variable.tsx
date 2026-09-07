import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UpsertVariableDrawer } from '@/components/variables/upsert-variable-drawer';
import { useEnvironment } from '@/context/environment/hooks';
import { useOnElementUnmount } from '@/hooks/use-on-element-unmount';
import { buildRoute, ROUTES } from '@/utils/routes';

export const UpsertVariablePage = () => {
  const [isOpen, setIsOpen] = useState(true);
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();

  const navigateToVariablesPage = () => {
    if (currentEnvironment?.slug) {
      navigate(buildRoute(ROUTES.VARIABLES, { environmentSlug: currentEnvironment.slug }));
    }
  };

  const { ref: unmountRef } = useOnElementUnmount({
    callback: navigateToVariablesPage,
    condition: !isOpen,
  });

  return (
    <UpsertVariableDrawer
      ref={unmountRef}
      isOpen={isOpen}
      onOpenChange={setIsOpen}
      onSuccess={navigateToVariablesPage}
      onCancel={navigateToVariablesPage}
    />
  );
};
