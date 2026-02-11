import { DuplicateWorkflowDto } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { duplicateWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { buildRoute, ROUTES } from '@/utils/routes';
import { workflowSchema } from '../components/workflow-editor/schema';
import { showErrorToast, showSuccessToast } from '../components/workflow-editor/toasts';

interface UseDuplicateWorkflowOptions {
  workflowSlug: string;
  onSuccess?: () => void;
}

export function useDuplicateWorkflow({ workflowSlug, onSuccess }: UseDuplicateWorkflowOptions) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const [toastId] = useState<string | number>('');

  const mutation = useMutation({
    mutationFn: async (workflow: DuplicateWorkflowDto) =>
      duplicateWorkflow({ environment: currentEnvironment!, workflow, workflowSlug }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflows, currentEnvironment?._id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTags, currentEnvironment?._id],
      });

      // Invalidate diff environment queries when workflows are duplicated
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      showSuccessToast(toastId);
      navigate(
        buildRoute(ROUTES.EDIT_WORKFLOW, {
          environmentSlug: currentEnvironment?.slug ?? '',
          workflowSlug: result.data.slug ?? '',
        })
      );

      onSuccess?.();
    },

    onError: (error) => {
      showErrorToast(toastId, error);
    },
  });

  const submit = (values: z.infer<typeof workflowSchema>) => {
    return mutation.mutateAsync({
      workflowId: values.workflowId,
      name: values.name,
      description: values.description || undefined,
      tags: values.tags || [],
      isTranslationEnabled: values.isTranslationEnabled,
    });
  };

  return {
    submit,
    isLoading: mutation.isPending,
  };
}
