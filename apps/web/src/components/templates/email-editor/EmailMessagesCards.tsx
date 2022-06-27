import { useQuery } from 'react-query';
import { IOrganizationEntity } from '@novu/shared';
import { EmailContentCard } from './EmailContentCard';
import { getCurrentOrganization } from '../../../api/organization';

export function EmailMessagesCards({
  index,
  variables,
  isIntegrationActive,
}: {
  index: number;
  variables: { name: string }[];
  isIntegrationActive: boolean;
}) {
  const { data: organization } = useQuery<IOrganizationEntity>('/v1/organizations/me', getCurrentOrganization);

  return (
    <EmailContentCard
      key={index}
      organization={organization}
      variables={variables}
      index={index}
      isIntegrationActive={isIntegrationActive}
    />
  );
}
