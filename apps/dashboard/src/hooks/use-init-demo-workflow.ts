import { IEnvironment, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { useEffect, useRef } from 'react';
import { createWorkflow } from '../api/workflows';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../config';
import { useFetchWorkflows } from './use-fetch-workflows';

// Environment-scoped state to prevent multiple simultaneous creations per environment
const creationStateMap = new Map<string, { isCreating: boolean; hasCreated: boolean }>();

// Helper functions to manage creation state per environment
function getCreationState(envId: string) {
  if (!creationStateMap.has(envId)) {
    creationStateMap.set(envId, { isCreating: false, hasCreated: false });
  }
  return creationStateMap.get(envId) as { isCreating: boolean; hasCreated: boolean };
}

function isCreating(envId: string): boolean {
  return getCreationState(envId).isCreating;
}

function setCreating(envId: string, value: boolean): void {
  getCreationState(envId).isCreating = value;
}

function hasCreated(envId: string): boolean {
  return getCreationState(envId).hasCreated;
}

function setHasCreated(envId: string, value: boolean): void {
  getCreationState(envId).hasCreated = value;
}

async function createDemoWorkflow({ environment }: { environment: IEnvironment }) {
  const envId = environment._id;

  // Prevent multiple simultaneous creations for this environment
  if (isCreating(envId) || hasCreated(envId)) {
    return;
  }

  setCreating(envId, true);

  // Safe origin for SSR/tests compatibility
  const safeOrigin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';

  try {
    await createWorkflow({
      environment,
      workflow: {
        name: 'Onboarding Demo Workflow',
        description: 'A demo workflow to showcase the Inbox component',
        workflowId: ONBOARDING_DEMO_WORKFLOW_ID,
        steps: [
          {
            name: 'Inbox 1',
            type: StepTypeEnum.IN_APP,
            controlValues: {
              subject: 'Notification with Multiple Actions',
              body: 'Add **Primary** and **Secondary Actions** to give users more choices, like **View** or **Dismiss**.',
              avatar: safeOrigin + '/images/novu.svg',
              primaryAction: {
                label: 'Primary Action',
                redirect: {},
              },
              secondaryAction: {
                label: 'Secondary Action',
                redirect: {},
              },
            },
          },
          {
            name: 'Inbox 2',
            type: StepTypeEnum.IN_APP,
            controlValues: {
              subject: 'Notification with a Single Action',
              body: 'Use a single, clear **Primary Action** to send users to a specific page or feature',
              avatar: safeOrigin + '/images/novu.svg',
              primaryAction: {
                label: 'Primary Action',
                redirect: {},
              },
            },
          },
          {
            name: 'Inbox 3',
            type: StepTypeEnum.IN_APP,
            controlValues: {
              subject: 'Basic Notification',
              body: 'No buttons, just a simple message. Perfect for announcements or alerts',
              avatar: safeOrigin + '/images/novu.svg',
            },
          },
        ],
        __source: WorkflowCreationSourceEnum.DASHBOARD,
      },
    });

    setHasCreated(envId, true);
  } catch (error) {
    console.error('Failed to create demo workflow:', error);
    // Reset creation state on error to allow retry for this environment
    setCreating(envId, false);
    throw error;
  } finally {
    setCreating(envId, false);
  }
}

export function useInitDemoWorkflow(environment: IEnvironment | undefined) {
  const { data, refetch } = useFetchWorkflows({ query: ONBOARDING_DEMO_WORKFLOW_ID });
  const initializedSet = useRef<Set<string>>(new Set());
  const currentEnvIdRef = useRef<string | undefined>(environment?._id);

  useEffect(() => {
    if (!data || !environment) return;

    const envId = environment._id;

    // Guard against stale data: verify that the environment hasn't changed since the data was fetched
    if (currentEnvIdRef.current !== envId) {
      // Environment has changed, skip processing this stale data
      return;
    }

    // Check if this environment has already been initialized
    if (initializedSet.current.has(envId)) return;

    const initializeDemoWorkflow = async () => {
      // Double-check if workflow exists (in case of race conditions)
      const workflow = data?.workflows.find((workflow) => workflow.workflowId === ONBOARDING_DEMO_WORKFLOW_ID);

      if (!workflow && !isCreating(envId) && !hasCreated(envId)) {
        try {
          await createDemoWorkflow({ environment });
          // Mark this environment as initialized after successful creation
          initializedSet.current.add(envId);
          // Refetch workflows after creation to update the cache
          await refetch();
        } catch (error) {
          console.error('Failed to initialize demo workflow:', error);
        }
      } else if (workflow) {
        // If workflow already exists, mark this environment as initialized
        initializedSet.current.add(envId);
      }
    };

    initializeDemoWorkflow();
  }, [data, environment?._id, refetch]);

  // Update the current environment ID ref when environment changes
  useEffect(() => {
    currentEnvIdRef.current = environment?._id;
  }, [environment?._id]);
}
