import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { getWorkflow, getWorkflows } from '@/api/workflows';
import { QueryKeys } from '@/utils/query-keys';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../config';
import { useEnvironment } from '../context/environment/hooks';

type FirstTriggerDetectionOptions = {
  enabled?: boolean;
  onFirstTriggerDetected?: () => void;
};

/**
 * Hook to detect if a workflow has been triggered
 * Uses the workflow's lastTriggeredAt field to detect if it has been triggered at any point
 * If the workflow was already triggered before, it's considered as completed
 */
export function useFirstTriggerDetection({ enabled = true, onFirstTriggerDetected }: FirstTriggerDetectionOptions) {
  const [hasDetectedFirstTrigger, setHasDetectedFirstTrigger] = useState(false);
  const [isWaitingForTrigger, setIsWaitingForTrigger] = useState(false);
  const [workflowSlug, setWorkflowSlug] = useState<string | null>(null);
  const { currentEnvironment } = useEnvironment();

  // First, fetch workflows to find the demo workflow slug
  const { data: workflowsData } = useQuery({
    queryKey: [QueryKeys.fetchWorkflows, currentEnvironment?._id, ONBOARDING_DEMO_WORKFLOW_ID],
    queryFn: () => {
      if (!currentEnvironment) throw new Error('Environment not available');
      return getWorkflows({
        environment: currentEnvironment,
        limit: 50,
        offset: 0,
        query: ONBOARDING_DEMO_WORKFLOW_ID,
        orderBy: '',
        orderDirection: 'DESC',
        tags: [],
        status: [],
      });
    },
    enabled: enabled && !!currentEnvironment?._id && !workflowSlug,
    refetchOnWindowFocus: false,
    staleTime: 30000, // Cache for 30 seconds since slug doesn't change
  });

  // Extract workflow slug from the search results
  useEffect(() => {
    if (workflowsData?.workflows) {
      const demoWorkflow = workflowsData.workflows.find((w) => w.workflowId?.includes(ONBOARDING_DEMO_WORKFLOW_ID));
      if (demoWorkflow?.slug && demoWorkflow.slug !== workflowSlug) {
        setWorkflowSlug(demoWorkflow.slug);
      }
    }
  }, [workflowsData, workflowSlug]);

  // Now fetch the specific workflow using the slug for polling
  const {
    data: workflow,
    isPending,
    error,
  } = useQuery({
    queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id, workflowSlug],
    queryFn: () => {
      if (!currentEnvironment || !workflowSlug) throw new Error('Environment or workflow slug not available');
      return getWorkflow({
        environment: currentEnvironment,
        workflowSlug: workflowSlug,
      });
    },
    enabled: enabled && !!currentEnvironment?._id && !!workflowSlug,
    refetchInterval: isWaitingForTrigger && !hasDetectedFirstTrigger ? 2000 : false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  // Check if workflow was already triggered (either before or during current session)
  useEffect(() => {
    if (!enabled || isPending || hasDetectedFirstTrigger || !workflow) {
      return;
    }

    // If lastTriggeredAt exists, the workflow has been triggered
    if (workflow.lastTriggeredAt) {
      setHasDetectedFirstTrigger(true);
      setIsWaitingForTrigger(false);
      onFirstTriggerDetected?.();
    }
  }, [workflow, isPending, hasDetectedFirstTrigger, enabled, onFirstTriggerDetected]);

  // Start waiting for trigger
  const startWaiting = useCallback(() => {
    if (hasDetectedFirstTrigger) {
      return;
    }
    setIsWaitingForTrigger(true);
  }, [hasDetectedFirstTrigger]);

  // Reset detection state
  const resetDetection = useCallback(() => {
    setHasDetectedFirstTrigger(false);
    setIsWaitingForTrigger(false);
    setWorkflowSlug(null);
  }, []);

  return {
    hasDetectedFirstTrigger,
    isWaitingForTrigger,
    startWaiting,
    resetDetection,
    isLoading: isPending,
    workflow,
    workflowSlug,
    lastTriggeredAt: workflow?.lastTriggeredAt,
    error,
  };
}
