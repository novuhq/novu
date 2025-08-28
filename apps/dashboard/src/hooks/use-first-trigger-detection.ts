import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { getWorkflow, getWorkflows } from '@/api/workflows';
import { QueryKeys } from '@/utils/query-keys';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../config';
import { useEnvironment } from '../context/environment/hooks';

type FirstTriggerDetectionOptions = {
  enabled?: boolean;
  onFirstTriggerDetected?: () => void;
  firstVisitTimestamp?: string | null; // ISO timestamp of current page visit to compare against
};

/**
 * Hook to detect if a workflow has been triggered
 * Uses the workflow's lastTriggeredAt field to detect if it has been triggered after the current page visit
 * If firstVisitTimestamp is provided, only triggers after that timestamp are considered
 */
export function useFirstTriggerDetection({
  enabled = true,
  onFirstTriggerDetected,
  firstVisitTimestamp,
}: FirstTriggerDetectionOptions) {
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
      const demoWorkflow = workflowsData.workflows.find((w) => w.workflowId === ONBOARDING_DEMO_WORKFLOW_ID);
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

  // Check if workflow was triggered after the first visit timestamp
  useEffect(() => {
    if (!enabled || isPending || hasDetectedFirstTrigger || !workflow) {
      return;
    }

    // If lastTriggeredAt exists, check if it happened after the current page visit
    if (workflow.lastTriggeredAt) {
      // If no firstVisitTimestamp is provided, use the old behavior (any trigger counts)
      if (!firstVisitTimestamp) {
        setHasDetectedFirstTrigger(true);
        setIsWaitingForTrigger(false);
        onFirstTriggerDetected?.();
        return;
      }

      // Compare timestamps - only count triggers that happened after the current page visit
      const triggerTime = new Date(workflow.lastTriggeredAt).getTime();
      const visitTime = new Date(firstVisitTimestamp).getTime();

      if (triggerTime > visitTime) {
        setHasDetectedFirstTrigger(true);
        setIsWaitingForTrigger(false);
        onFirstTriggerDetected?.();
      }
    }
  }, [workflow, isPending, hasDetectedFirstTrigger, enabled, onFirstTriggerDetected, firstVisitTimestamp]);

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
