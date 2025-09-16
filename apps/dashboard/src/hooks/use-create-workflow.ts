import { type CreateWorkflowDto, WorkflowCreationSourceEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { NovuApiError } from '@/api/api.client';
import { createWorkflow } from '@/api/workflows';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { buildRoute, ROUTES } from '@/utils/routes';
import { workflowSchema } from '../components/workflow-editor/schema';
import { showErrorToast, showSuccessToast } from '../components/workflow-editor/toasts';

interface UseCreateWorkflowOptions {
  onSuccess?: () => void;
}

export function useCreateWorkflow({ onSuccess }: UseCreateWorkflowOptions = {}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const lastSubmittedWorkflowIdRef = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (workflow: CreateWorkflowDto) => {
      if (!currentEnvironment) {
        throw new Error('No current environment selected');
      }
      return createWorkflow({ environment: currentEnvironment, workflow });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflows, currentEnvironment?._id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTags, currentEnvironment?._id],
      });

      // Invalidate diff environment queries when workflows are created
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      showSuccessToast();
      navigate(
        buildRoute(ROUTES.EDIT_WORKFLOW, {
          environmentSlug: currentEnvironment?.slug ?? '',
          workflowSlug: result.data.slug ?? '',
        })
      );

      onSuccess?.();
    },

    onError: (error) => {
      const isLayoutMissing =
        error instanceof NovuApiError &&
        (error.message?.toLowerCase().includes('layout not found') || error.status === 404);

      if (isLayoutMissing && lastSubmittedWorkflowIdRef.current) {
        navigate(
          buildRoute(ROUTES.EDIT_WORKFLOW, {
            environmentSlug: currentEnvironment?.slug ?? '',
            workflowSlug: lastSubmittedWorkflowIdRef.current,
          })
        );
        return;
      }

      showErrorToast(undefined, error);
    },
  });

  const submit = (values: z.infer<typeof workflowSchema>, template?: CreateWorkflowDto) => {
    lastSubmittedWorkflowIdRef.current = values.workflowId;
    return mutation.mutateAsync({
      name: values.name,
      steps: template?.steps ?? [],
      __source: template?.__source ?? WorkflowCreationSourceEnum.DASHBOARD,
      workflowId: values.workflowId,
      description: values.description || undefined,
      tags: values.tags || [],
      isTranslationEnabled: values.isTranslationEnabled || false,
      payloadSchema: template?.payloadSchema,
    });
  };

  return {
    submit,
    isLoading: mutation.isPending,
  };
}
