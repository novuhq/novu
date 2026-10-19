import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';
import { getWorkflow, getWorkflows } from '@/api/workflows';
import { QueryKeys } from '@/utils/query-keys';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../config';
import { requireEnvironment, useEnvironment } from '../context/environment/hooks';

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
  const [notFound, setNotFound] = useState(false);
  const { currentEnvironment } = useEnvironment();

  // Create a stable reference for the callback
  const stableOnFirstTriggerDetected = useCallback(() => {
    onFirstTriggerDetected?.();
  }, [onFirstTriggerDetected]);

  // First, fetch workflows to find the demo workflow slug
  const {
    data: workflowsData,
    isPending: isWorkflowsLoading,
    error: workflowsError,
    isError: isWorkflowsError,
  } = useQuery({
    queryKey: [QueryKeys.fetchWorkflows, currentEnvironment?._id, ONBOARDING_DEMO_WORKFLOW_ID],
    queryFn: () => {
      const environment = requireEnvironment(currentEnvironment, 'Environment not available');

      return getWorkflows({
        environment,
        limit: 50,
        offset: 0,
        query: ONBOARDING_DEMO_WORKFLOW_ID,
        orderBy: '',
        orderDirection: 'DESC',
        tags: [],
        status: [],
      });
    },
    enabled: enabled && !!currentEnvironment?._id && !workflowSlug && !notFound,
    refetchOnWindowFocus: false,
    staleTime: 30000, // Cache for 30 seconds since slug doesn't change
  });

  // Extract workflow slug from the search results
  useEffect(() => {
    if (workflowsData?.workflows) {
      const demoWorkflow = workflowsData.workflows.find((w) => w.workflowId === ONBOARDING_DEMO_WORKFLOW_ID);
      if (demoWorkflow?.slug && demoWorkflow.slug !== workflowSlug) {
        setWorkflowSlug(demoWorkflow.slug);
        setNotFound(false);
      } else if (!demoWorkflow) {
        // Workflow not found in search results
        setNotFound(true);
        setIsWaitingForTrigger(false);
      }
    }
  }, [workflowsData, workflowSlug]);

  // Now fetch the specific workflow using the slug for polling
  const {
    data: workflow,
    isPending,
    error: workflowError,
    isError: isWorkflowError,
  } = useQuery({
    queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id, workflowSlug],
    queryFn: () => {
      const environment = requireEnvironment(currentEnvironment, 'Environment or workflow slug not available');

      if (!workflowSlug) {
        throw new Error('Environment or workflow slug not available');
      }

      return getWorkflow({
        environment,
        workflowSlug: workflowSlug,
      });
    },
    enabled: enabled && !!currentEnvironment?._id && !!workflowSlug && !notFound,
    refetchInterval: isWaitingForTrigger && !hasDetectedFirstTrigger && !notFound ? 2000 : false,
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
        stableOnFirstTriggerDetected();
        return;
      }

      let triggerTime: number;
      let visitTime: number;

      try {
        // Parse both timestamps inside try/catch
        triggerTime = new Date(workflow.lastTriggeredAt).getTime();
        visitTime = new Date(firstVisitTimestamp).getTime();

        // Validate both timestamps are valid numbers
        if (!Number.isFinite(triggerTime) || Number.isNaN(triggerTime)) {
          console.error('Invalid lastTriggeredAt timestamp:', workflow.lastTriggeredAt);
          setIsWaitingForTrigger(false);
          return;
        }

        if (!Number.isFinite(visitTime) || Number.isNaN(visitTime)) {
          console.error('Invalid firstVisitTimestamp:', firstVisitTimestamp);
          setIsWaitingForTrigger(false);
          return;
        }

        const now = Date.now();

        // Check if visitTime is in the future
        if (visitTime > now) {
          console.warn('First visit timestamp is in the future, ignoring detection:', firstVisitTimestamp);
          setIsWaitingForTrigger(false);
          return;
        }

        // Check if triggerTime is in the future - treat as not detected
        if (triggerTime > now) {
          console.warn('Trigger timestamp is in the future, treating as not detected:', workflow.lastTriggeredAt);
          setIsWaitingForTrigger(true);
          return;
        }

        // All validation passed, now check if trigger happened after visit
        if (triggerTime > visitTime) {
          setHasDetectedFirstTrigger(true);
          setIsWaitingForTrigger(false);
          stableOnFirstTriggerDetected();
        }
      } catch (error) {
        console.error('Error parsing timestamps:', {
          error,
          lastTriggeredAt: workflow.lastTriggeredAt,
          firstVisitTimestamp,
        });
        setIsWaitingForTrigger(false);
      }
    }
  }, [workflow, isPending, hasDetectedFirstTrigger, enabled, stableOnFirstTriggerDetected, firstVisitTimestamp]);

  // Start waiting for trigger
  const startWaiting = useCallback(() => {
    if (hasDetectedFirstTrigger || notFound) {
      return;
    }
    setIsWaitingForTrigger(true);
  }, [hasDetectedFirstTrigger, notFound]);

  // Reset detection state
  const resetDetection = useCallback(() => {
    setHasDetectedFirstTrigger(false);
    setIsWaitingForTrigger(false);
    setWorkflowSlug(null);
    setNotFound(false);
  }, []);

  return {
    hasDetectedFirstTrigger,
    isWaitingForTrigger,
    startWaiting,
    resetDetection,
    isLoading: isPending || isWorkflowsLoading,
    workflow,
    workflowSlug,
    lastTriggeredAt: workflow?.lastTriggeredAt,
    error: workflowError,
    isError: isWorkflowError,
    workflowsError,
    isWorkflowsError,
    notFound,
  };
}
