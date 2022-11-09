import { useContext } from 'react';

import { EmailContentCard } from './EmailContentCard';
import { AuthContext } from '../../../store/authContext';

export function EmailMessagesCards({ index, isIntegrationActive }: { index: number; isIntegrationActive: boolean }) {
  const { currentOrganization } = useContext(AuthContext);

  return (
    <EmailContentCard
      key={index}
      organization={currentOrganization}
      index={index}
      isIntegrationActive={isIntegrationActive}
    />
  );
}
