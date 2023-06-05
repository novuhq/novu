import { useEffect, useState } from 'react';
import { ChannelTypeEnum, IWorkflowProperties, StepTypeEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { generateTemplateContentWithAI } from '../../../api/notification-templates';
import { useFormContext } from 'react-hook-form';
import { IForm } from './formTypes';

export function useGenerateContentWithAI(
  channel: ChannelTypeEnum | StepTypeEnum,
  context: string,
  workflow: Record<string, unknown>,
  index: number
) {
  const [fetchingError, setFetchingError] = useState<string | undefined>(undefined);
  const queryClient = useQueryClient();
  const { setValue } = useFormContext<IForm>();

  const {
    isLoading: isFetching,
    mutate: fetchGenerateContentWithAI,
    data,
  } = useMutation<unknown, { error: string; message: string; statusCode: number }>(
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

  useEffect(() => {
    if (!data) {
      return;
    }
    setValue(`steps.${index}.template.htmlContent`, data as string);
    setValue(`steps.${index}.template.contentType`, 'customHtml');
  }, [data, index]);

  return {
    isFetching,
    fetchGenerateContentWithAI,
    fetchingError,
    setFetchingError,
  };
}
