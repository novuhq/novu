import { useNavigate } from 'react-router-dom';

import { ROUTES } from '../../../constants/routes.enum';
import type { IIntegratedProvider } from '../types';
import { SelectProviderSidebar } from './multi-provider/SelectProviderSidebar';

export const SelectProviderPage = () => {
  const navigate = useNavigate();

  const onClose = () => {
    navigate(ROUTES.INTEGRATIONS);
  };

  const onNextStepClick = (selectedProvider: IIntegratedProvider) => {
    navigate(`/integrations/create/${selectedProvider.channel}/${selectedProvider.providerId}`);
  };

  return <SelectProviderSidebar isOpened onClose={onClose} onNextStepClick={onNextStepClick} />;
};
