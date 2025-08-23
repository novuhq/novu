import { IEnvironment, StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';
import { useEffect, useRef } from 'react';
import { createWorkflow } from '../api/workflows';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../config';
import { useFetchWorkflows } from './use-fetch-workflows';

// Global state to prevent multiple simultaneous creations
const creationState = {
  isCreating: false,
  hasCreated: false,
};

async function createDemoWorkflow({ environment }: { environment: IEnvironment }) {
  // Prevent multiple simultaneous creations
  if (creationState.isCreating || creationState.hasCreated) {
    return;
  }

  creationState.isCreating = true;

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
              avatar: `${window.location.origin}/images/novu.svg`,
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
              avatar: `${window.location.origin}/images/novu.svg`,
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
              avatar: `${window.location.origin}/images/novu.svg`,
            },
          },
        ],
        __source: WorkflowCreationSourceEnum.DASHBOARD,
      },
    });

    creationState.hasCreated = true;
  } catch (error) {
    console.error('Failed to create demo workflow:', error);
    // Reset creation state on error to allow retry
    creationState.isCreating = false;
    throw error;
  } finally {
    creationState.isCreating = false;
  }
}

export function useInitDemoWorkflow(environment: IEnvironment | undefined) {
  const { data, refetch } = useFetchWorkflows({ query: ONBOARDING_DEMO_WORKFLOW_ID });
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!data || !environment || hasInitialized.current) return;

    const initializeDemoWorkflow = async () => {
      // Double-check if workflow exists (in case of race conditions)
      const workflow = data?.workflows.find((workflow) => workflow.workflowId?.includes(ONBOARDING_DEMO_WORKFLOW_ID));

      if (!workflow && !creationState.isCreating && !creationState.hasCreated) {
        hasInitialized.current = true;

        try {
          await createDemoWorkflow({ environment });
          // Refetch workflows after creation to update the cache
          await refetch();
        } catch (error) {
          // Reset on error to allow retry
          hasInitialized.current = false;
          console.error('Failed to initialize demo workflow:', error);
        }
      }
    };

    initializeDemoWorkflow();
  }, [data, environment, refetch]);
}
