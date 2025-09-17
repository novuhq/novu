import { type CreateWorkflowDto, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { getLayouts } from '@/api/layouts';
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
      showErrorToast(undefined, error);
    },
  });

  async function getDefaultLayoutId(): Promise<string | undefined> {
    if (!currentEnvironment) return undefined;

    const list = await getLayouts({
      environment: currentEnvironment,
      limit: 200,
      offset: 0,
      query: '',
      orderBy: 'createdAt',
      orderDirection: 'DESC',
    });

    return list.layouts.find((l) => l.isDefault)?.layoutId;
  }

  async function applyDefaultLayoutToTemplate(template: CreateWorkflowDto): Promise<CreateWorkflowDto> {
    const hasEmailSteps = template.steps?.some((step) => step.type === StepTypeEnum.EMAIL);
    if (!hasEmailSteps) return template;

    const defaultLayoutId = await getDefaultLayoutId();
    if (!defaultLayoutId) return template;

    const steps = template.steps.map((step) => {
      if (step.type !== StepTypeEnum.EMAIL) return step;

      const currentValues = (step.controlValues ?? {}) as Record<string, unknown>;
      if (typeof currentValues.layoutId === 'string' || currentValues.layoutId === null) {
        return step;
      }

      return {
        ...step,
        controlValues: { ...currentValues, layoutId: defaultLayoutId },
      };
    });

    return { ...template, steps };
  }

  const submit = async (values: z.infer<typeof workflowSchema>, template?: CreateWorkflowDto) => {
    const processedTemplate = template ? await applyDefaultLayoutToTemplate(template) : undefined;

    return mutation.mutateAsync({
      name: values.name,
      steps: processedTemplate?.steps ?? [],
      __source: processedTemplate?.__source ?? WorkflowCreationSourceEnum.DASHBOARD,
      workflowId: values.workflowId,
      description: values.description || undefined,
      tags: values.tags || [],
      isTranslationEnabled: values.isTranslationEnabled || false,
      payloadSchema: processedTemplate?.payloadSchema,
    });
  };

  return {
    submit,
    isLoading: mutation.isPending,
  };
}
