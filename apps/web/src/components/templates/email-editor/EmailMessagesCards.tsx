import { useQuery } from 'react-query';
import { IEnvironment } from '@novu/shared';
import { FieldArrayWithId } from 'react-hook-form';
import { IForm } from '../use-template-controller.hook';
import { getCurrentEnvironment } from '../../../api/environment';
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
  const { data: environment } = useQuery<IEnvironment>('currentEnvironment', getCurrentEnvironment);

  return (
    <>
      {emailMessagesFields.map((message, index) => {
        return (
          <EmailContentCard
            key={index}
            environment={environment}
            variables={variables}
            index={index}
            isIntegrationActive={isIntegrationActive}
          />
        );
      })}
    </>
  );
}
