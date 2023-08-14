import { ChannelTypeEnum } from '@novu/shared';
import { useSearchParams, useNavigate } from 'react-router-dom';

import { ROUTES } from '../../../constants/routes.enum';
import type { IIntegratedProvider } from '../types';
import { SelectProviderSidebar } from './multi-provider/SelectProviderSidebar';

export const SelectProviderPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const scrollTo = params.get('scrollTo') as ChannelTypeEnum | undefined;

  const onClose = () => {
    navigate(ROUTES.INTEGRATIONS);
  };

  const onNextStepClick = (selectedProvider: IIntegratedProvider) => {
    navigate(`/integrations/create/${selectedProvider.channel}/${selectedProvider.providerId}`);
  };

  return <SelectProviderSidebar isOpened scrollTo={scrollTo} onClose={onClose} onNextStepClick={onNextStepClick} />;
};
