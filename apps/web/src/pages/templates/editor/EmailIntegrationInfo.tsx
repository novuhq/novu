import { useContext } from 'react';
import { useIntegrationLimit } from '../../../api/hooks/integrations/useIntegrationLimit';
import { ChannelTypeEnum } from '@novu/shared';
import { AuthContext } from '../../../store/authContext';

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
  const { enabled, loading } = useIntegrationLimit(ChannelTypeEnum.EMAIL);
  const { currentOrganization } = useContext(AuthContext);

  if (integration) {
    return <>{integration?.credentials[field]}</>;
  }

  if (loading) {
    return null;
  }

  if (!enabled) {
    return <>No active email integration</>;
  }

  if (field === 'from') {
    return <>no-reply@novu.co</>;
  }

  return <>{currentOrganization?.name || 'Novu'}</>;
};
