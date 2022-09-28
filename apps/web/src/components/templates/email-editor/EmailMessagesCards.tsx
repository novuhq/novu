import { useContext } from 'react';
import { EmailContentCard } from './EmailContentCard';
import { AuthContext } from '../../../store/authContext';

export function EmailMessagesCards({
  index,
  variables,
  isIntegrationActive,
}: {
  index: number;
  variables: { name: string }[];
  isIntegrationActive: boolean;
}) {
  const { currentOrganization } = useContext(AuthContext);

  return (
    <EmailContentCard
      key={index}
      organization={currentOrganization}
      variables={variables}
      index={index}
      isIntegrationActive={isIntegrationActive}
    />
  );
}
