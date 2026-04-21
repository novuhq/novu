import {
  CreateWorkflowDto,
  FeatureFlagsKeysEnum,
  StepTypeEnum,
  WorkflowCreationSourceEnum,
  WorkflowResponseDto,
} from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { fetchOnboardingWorkflowSuggestions, OnboardingSuggestionsResponse } from '@/api/ai';
import { IWorkflowSuggestion } from '@/components/template-store/types';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from './use-feature-flag';
import { QuickTemplate } from './use-template-store';

const QUERY_KEY = 'onboarding-suggestions';
const REFETCH_INTERVAL_PENDING = 5000;

function mapWorkflowToSuggestion(wf: WorkflowResponseDto): IWorkflowSuggestion {
  return {
    id: wf._id,
    name: wf.name,
    description: wf.description ?? '',
    tags: wf.tags ?? [],
    workflowDefinition: {
      name: wf.name,
      description: wf.description,
      workflowId: wf.workflowId,
      tags: wf.tags,
      active: wf.active,
      __source: WorkflowCreationSourceEnum.TEMPLATE_STORE,
      steps: (wf.steps ?? []).map((s) => ({
        stepId: s.stepId,
        name: s.name,
        type: s.type as StepTypeEnum,
        controlValues:
          s.controlValues ?? (s as { controls?: { values?: Record<string, unknown> } }).controls?.values ?? {},
      })) as CreateWorkflowDto['steps'],
      payloadSchema: wf.payloadSchema as object | undefined,
    },
  };
}

function mapWorkflowToQuickTemplate(wf: WorkflowResponseDto): QuickTemplate {
  return {
    workflowId: wf.workflowId || wf._id,
    name: wf.name,
    description: wf.description ?? '',
    steps: (wf.steps ?? []).map((s) => s.type as StepTypeEnum),
    tags: wf.tags ?? [],
  };
}

export function useOnboardingWorkflowSuggestions() {
  const isAiWorkflowGenerationEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AI_WORKFLOW_GENERATION_ENABLED);
  const { currentEnvironment } = useEnvironment();

  const { data, isLoading, isError } = useQuery<OnboardingSuggestionsResponse>({
    queryKey: [QUERY_KEY, currentEnvironment?._id],
    queryFn: () => fetchOnboardingWorkflowSuggestions({ environment: currentEnvironment! }),
    enabled: isAiWorkflowGenerationEnabled && !!currentEnvironment,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'pending' || status === 'generating') {
        return REFETCH_INTERVAL_PENDING;
      }

      return false;
    },
  });

  const status = data?.status ?? null;
  const isGenerating = status === 'pending' || status === 'generating';
  const hasPersonalizedSuggestions = status === 'completed' && (data?.suggestions?.length ?? 0) > 0;

  const suggestions = useMemo(() => (data?.suggestions ?? []).map(mapWorkflowToSuggestion), [data?.suggestions]);

  const quickTemplates = useMemo(() => (data?.suggestions ?? []).map(mapWorkflowToQuickTemplate), [data?.suggestions]);

  return {
    status,
    isGenerating,
    hasPersonalizedSuggestions,
    suggestions,
    quickTemplates,
    isLoading,
    isError,
  };
}
