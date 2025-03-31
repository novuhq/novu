import { useMemo } from 'react';

import { FormLabel, FormMessage } from '@/components/primitives/form/form';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { parseStepVariablesToLiquidVariables } from '@/utils/parseStepVariablesToLiquidVariables';
import { urlTargetTypes } from '@/utils/url';
import { URLInput } from '../../url-input';

export const InAppRedirect = () => {
  const { step } = useWorkflow();
  const variables = useMemo(() => (step ? parseStepVariablesToLiquidVariables(step.variables) : []), [step]);

  return (
    <div className="flex flex-col gap-1">
      <FormLabel
        optional
        tooltip={
          <>
            <p>Defines the URL to navigate to when the notification is clicked.</p>
            <p>{`Or, use the onNotificationClick handler in the <Inbox />.`}</p>
          </>
        }
      >
        Redirect URL
      </FormLabel>
      <URLInput
        options={urlTargetTypes}
        placeholder="/tasks/{{taskId}}"
        fields={{
          urlKey: 'redirect.url',
          targetKey: 'redirect.target',
        }}
        variables={variables}
      />
      <FormMessage />
    </div>
  );
};
