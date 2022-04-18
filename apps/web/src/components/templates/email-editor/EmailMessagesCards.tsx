import { useQuery } from 'react-query';
import { IOrganizationEntity } from '@novu/shared';
import { FieldArrayWithId } from 'react-hook-form';
import { IForm } from '../use-template-controller.hook';
import { EmailContentCard } from './EmailContentCard';
import { getCurrentOrganization } from '../../../api/organization';

export function EmailMessagesCards({
  emailMessagesFields,
  onRemoveTab,
  variables,
  isIntegrationActive,
}: {
  emailMessagesFields: FieldArrayWithId<IForm, 'emailMessages'>[];
  onRemoveTab: (index: number) => void;
  variables: { name: string }[];
  isIntegrationActive: boolean;
}) {
  const { data: organization } = useQuery<IOrganizationEntity>('/v1/organizations/me', getCurrentOrganization);

  return (
    <>
      {emailMessagesFields.map((message, index) => {
        return (
          <EmailContentCard
            key={index}
            organization={organization}
            variables={variables}
            index={index}
            isIntegrationActive={isIntegrationActive}
          />
        );
      })}
    </>
  );
}
