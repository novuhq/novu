import { useState } from 'react';
import { ChannelTypeEnum, IWorkflowProperties, StepTypeEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { generateTemplateContentWithAI } from '../../../api/notification-templates';

export function useGenerateContentWithAI(
  channel: ChannelTypeEnum | StepTypeEnum,
  context: string,
  workflow: Record<string, unknown>
) {
  const [fetchingError, setFetchingError] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();

  const { isLoading: isFetching, mutate: fetchGenerateContentWithAI } = useMutation<
    unknown,
    { error: string; message: string; statusCode: number }
  >(
    () => {
      const { name: workflowName, templateName } = workflow || {};
      if (!channel || !workflowName || !templateName) {
        return Promise.reject('Missing any of the mandatory parameters to generate the AI content');
      }

      const payload = {
        channel,
        prompt: context,
        workflow,
      };

      return generateTemplateContentWithAI(payload);
    },
    {
      onError: (error) => {
        setFetchingError(error?.message);
      },
    }
  );

  return {
    isFetching,
    fetchGenerateContentWithAI,
    fetchingError,
    setFetchingError,
  };
}
