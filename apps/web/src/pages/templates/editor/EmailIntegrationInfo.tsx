import { useContext } from 'react';
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
  const { currentOrganization } = useContext(AuthContext);

  if (integration) {
    return <>{integration?.credentials[field]}</>;
  }
  if (field === 'from') {
    return <>no-reply@novu.co</>;
  }

  return <>{currentOrganization?.name || 'Novu'}</>;
};
