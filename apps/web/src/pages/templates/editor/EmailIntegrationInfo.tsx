import { useIntegrationLimit } from '../../../hooks';
import { ChannelTypeEnum } from '@novu/shared';
import { useAuthContext } from '../../../components/providers/AuthProvider';

export const EmailIntegrationInfo = ({
  integration,
  field = 'from',
}: {
  integration?: {
    credentials: {
      senderName?: string;
      from?: string;
    };
  };
  field: 'from' | 'senderName';
}) => {
  const { isLimitFetchingEnabled, loading } = useIntegrationLimit(ChannelTypeEnum.EMAIL);
  const { currentOrganization } = useAuthContext();

  if (integration) {
    return <>{integration?.credentials[field]}</>;
  }

  if (loading) {
    return null;
  }

  if (!isLimitFetchingEnabled) {
    return <>No active email integration</>;
  }

  if (field === 'from') {
    return <>no-reply@novu.co</>;
  }

  return <>{currentOrganization?.name || 'Novu'}</>;
};
