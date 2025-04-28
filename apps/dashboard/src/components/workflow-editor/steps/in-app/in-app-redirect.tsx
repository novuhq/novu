import { FormLabel, FormMessage } from '@/components/primitives/form/form';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { urlTargetTypes } from '@/utils/url';
import { URLInput } from '../../url-input';

export const InAppRedirect = () => {
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

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
        placeholder="/tasks/{{payload.taskId}}"
        fields={{
          urlKey: 'redirect.url',
          targetKey: 'redirect.target',
        }}
        variables={variables}
        isAllowedVariable={isAllowedVariable}
      />
      <FormMessage />
    </div>
  );
};
