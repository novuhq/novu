import { useQuery } from 'react-query';
import { IApplication } from '@notifire/shared';
import { FieldArrayWithId } from 'react-hook-form';
import { IForm } from '../use-template-controller.hook';
import { getCurrentApplication } from '../../../api/application';
import { EmailContentCard } from './EmailContentCard';

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
  const { data: application } = useQuery<IApplication>('currentApplication', getCurrentApplication);

  return (
    <>
      {emailMessagesFields.map((message, index) => {
        return (
          <EmailContentCard
            key={index}
            application={application}
            variables={variables}
            index={index}
            isIntegrationActive={isIntegrationActive}
          />
        );
      })}
    </>
  );
}
