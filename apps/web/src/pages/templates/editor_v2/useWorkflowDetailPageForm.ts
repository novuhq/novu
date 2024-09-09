import { INotificationTemplate } from '@novu/shared';
import { useEffect, useMemo } from 'react';
import { useFormContext, SubmitHandler } from 'react-hook-form';
import { useUpdateTemplate } from '../../../api/hooks/index';
import { useUpdateWorkflowChannelPreferences } from '../../../hooks/workflowChannelPreferences/useUpdateWorkflowChannelPreferences';
import { WorkflowDetailFormContext } from '../../../studio/components/workflows/preferences/WorkflowDetailFormContextProvider';

type UseWorkflowDetailPageFormProps = {
  templateId: string;
  workflow: INotificationTemplate | undefined;
};

export const useWorkflowDetailPageForm = ({ templateId, workflow }: UseWorkflowDetailPageFormProps) => {
  const { formState, setValue, resetField, reset, handleSubmit, getValues, watch } =
    useFormContext<WorkflowDetailFormContext>();

  const workflowName = watch('general.name');

  const { updateWorkflowChannelPreferences, isLoading: isUpdatingPreferences } = useUpdateWorkflowChannelPreferences(
    templateId,
    {
      onSuccess: () => {
        resetField('preferences');
      },
    }
  );
  const { updateTemplateMutation, isLoading: isUpdatingGeneralSettings } = useUpdateTemplate({
    onSuccess: () => {
      resetField('general');
    },
  });

  const hasChanges = Object.keys(formState.dirtyFields).length > 0;

  const onSubmit: SubmitHandler<WorkflowDetailFormContext> = () => {
    if (formState.dirtyFields?.preferences) {
      updateWorkflowChannelPreferences(getValues('preferences'));
    }

    if (formState.dirtyFields?.general) {
      const { workflowId, ...templateValues } = getValues('general');
      updateTemplateMutation({ id: templateId, data: { ...templateValues, identifier: workflowId } });
    }

    reset();
  };

  useEffect(() => {
    if (workflow) {
      setValue('general', {
        workflowId: workflow.triggers?.[0]?.identifier ?? '',
        name: workflow.name,
        description: workflow.description,
      });
    }
  }, [workflow]);

  return {
    submitWorkflow: handleSubmit(onSubmit),
    hasChanges,
    isSubmitting: isUpdatingGeneralSettings || isUpdatingPreferences,
    workflowName,
  };
};
