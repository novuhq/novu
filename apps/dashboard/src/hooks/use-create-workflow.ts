import { type CreateWorkflowDto, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { NovuApiError } from '@/api/api.client';
import { getLayouts } from '@/api/layouts';
import { createWorkflow } from '@/api/workflows';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { buildRoute, ROUTES } from '@/utils/routes';
import { workflowSchema } from '../components/workflow-editor/schema';
import { showErrorToast, showSuccessToast } from '../components/workflow-editor/toasts';

interface UseCreateWorkflowOptions {
  onSuccess?: () => void;
}

export type WorkflowLimitError = {
  limit: number;
};

/**
 * Maps a create-workflow API rejection to the limit dialog: a 402 or 409 that carries
 * a numeric `limit`. Other errors, including other 409 conflicts, fall through to the caller.
 */
export function parseWorkflowLimitError(error: unknown): WorkflowLimitError | null {
  if (!(error instanceof NovuApiError)) {
    return null;
  }

  const rawLimit = (error.rawError as { limit?: unknown } | undefined)?.limit;

  if (typeof rawLimit !== 'number') {
    return null;
  }

  if (error.status === 402 || error.status === 409) {
    return { limit: rawLimit };
  }

  return null;
}

type SubmitOptions = {
  source?: WorkflowCreationSourceEnum;
  /** Navigation state for the editor the new workflow opens in. */
  navigationState?: unknown;
};

export function useCreateWorkflow({ onSuccess }: UseCreateWorkflowOptions = {}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentEnvironment } = useEnvironment();
  const [workflowLimitError, setWorkflowLimitError] = useState<WorkflowLimitError | null>(null);

  const mutation = useMutation({
    mutationFn: async ({ workflow }: { workflow: CreateWorkflowDto; navigationState?: unknown }) => {
      const environment = requireEnvironment(currentEnvironment, 'No current environment selected');

      return createWorkflow({ environment, workflow });
    },
    onSuccess: async (result, { navigationState }) => {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflows, currentEnvironment?._id] });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTags, currentEnvironment?._id],
      });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      showSuccessToast();
      navigate(
        buildRoute(ROUTES.EDIT_WORKFLOW, {
          environmentSlug: currentEnvironment?.slug ?? '',
          workflowSlug: result.data.slug ?? '',
        }),
        { state: navigationState }
      );

      onSuccess?.();
    },
    onError: (error) => {
      const limitError = parseWorkflowLimitError(error);

      if (limitError) {
        setWorkflowLimitError(limitError);

        return;
      }

      showErrorToast(undefined, error);
    },
  });

  const submit = async (
    values: z.infer<typeof workflowSchema>,
    template?: CreateWorkflowDto,
    { source, navigationState }: SubmitOptions = {}
  ) => {
    let steps = template?.steps ?? [];

    const isFromTemplateStore = template?.__source === WorkflowCreationSourceEnum.TEMPLATE_STORE;
    const hasEmailWithoutLayout = steps.some(
      (s) =>
        s.type === StepTypeEnum.EMAIL &&
        (!s.controlValues || (s.controlValues as Record<string, unknown>).layoutId == null)
    );

    if (isFromTemplateStore && hasEmailWithoutLayout && currentEnvironment) {
      try {
        const layouts = await getLayouts({
          environment: currentEnvironment,
          limit: 100,
          offset: 0,
          query: '',
        });
        const defaultLayoutId = layouts.layouts.find((l) => l.isDefault)?.layoutId;
        if (defaultLayoutId) {
          steps = steps.map((s) => {
            if (s.type !== StepTypeEnum.EMAIL) return s;
            const controlValues = { ...(s.controlValues || {}) } as Record<string, unknown>;
            if (controlValues.layoutId == null) controlValues.layoutId = defaultLayoutId;
            return { ...s, controlValues };
          });
        }
      } catch {
        // proceed without modifying steps if layouts fetch fails
      }
    }

    return mutation.mutateAsync({
      workflow: {
        name: values.name,
        steps,
        __source: source ?? template?.__source ?? WorkflowCreationSourceEnum.DASHBOARD,
        workflowId: values.workflowId,
        description: values.description || undefined,
        tags: values.tags || [],
        isTranslationEnabled: values.isTranslationEnabled || false,
        payloadSchema: template?.payloadSchema,
      },
      navigationState,
    });
  };

  return {
    submit,
    isLoading: mutation.isPending,
    /** Set when creation was blocked by a workflow limit; render `WorkflowLimitUpgradeDialog` with it. */
    workflowLimitError,
    clearWorkflowLimitError: () => setWorkflowLimitError(null),
  };
}
