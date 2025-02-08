import { useMemo } from 'react';

import { FormLabel } from '@/components/primitives/form/form';
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
        tooltip="The redirect object defines the URL to visit when the notification is clicked. Alternatively, use an onNotificationClick handler in the <Inbox /> component."
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
    </div>
  );
};
