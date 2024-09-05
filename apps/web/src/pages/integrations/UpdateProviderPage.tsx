import { useNavigate, useParams } from 'react-router-dom';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '../../hooks';
import { ROUTES } from '../../constants/routes';
import { UpdateProviderSidebar } from './components/multi-provider/v2';
import { UpdateProviderSidebar as UpdateProviderSidebarOld } from './components/multi-provider/UpdateProviderSidebar';

export function UpdateProviderPage() {
  const { integrationId } = useParams();
  const navigate = useNavigate();
  const isV2Enabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_V2_ENABLED);

  const onClose = () => {
    navigate(ROUTES.INTEGRATIONS);
  };

  return isV2Enabled ? (
    <UpdateProviderSidebar key={integrationId} isOpened onClose={onClose} integrationId={integrationId} />
  ) : (
    <UpdateProviderSidebarOld key={integrationId} isOpened onClose={onClose} integrationId={integrationId} />
  );
}
