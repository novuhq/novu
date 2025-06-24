import { useEffect } from 'react';
import { IEnvironment } from '@novu/shared';
import { ONBOARDING_DEMO_WORKFLOW_ID } from '../config';
import { useFetchWorkflows } from './use-fetch-workflows';
import { createWorkflow } from '../api/workflows';
import { StepTypeEnum, WorkflowCreationSourceEnum } from '@novu/shared';

async function createDemoWorkflow({ environment }: { environment: IEnvironment }) {
  await createWorkflow({
    environment,
    workflow: {
      name: 'Onboarding Demo Workflow',
      description: 'A demo workflow to showcase the Inbox component',
      workflowId: ONBOARDING_DEMO_WORKFLOW_ID,
      steps: [
        {
          name: 'Inbox',
          type: StepTypeEnum.IN_APP,
          controlValues: {
            subject: '**In-App Notification Subject**',
            body: "Welcome to Novu! This is a demo notification to showcase the Inbox component. You can customize the content, styling and actions of notifications to match your app's needs.",
            avatar: window.location.origin + '/images/novu.svg',
            primaryAction: {
              label: 'Add to your app',
              redirect: {
                target: '_blank',
                url: '/onboarding/inbox/embed',
              },
            },
          },
        },
      ],
      __source: WorkflowCreationSourceEnum.DASHBOARD,
    },
  });
}

export function useInitDemoWorkflow(environment: IEnvironment) {
  const { data } = useFetchWorkflows({ query: ONBOARDING_DEMO_WORKFLOW_ID });

  useEffect(() => {
    if (!data) return;

    const initializeDemoWorkflow = async () => {
      const workflow = data?.workflows.find((workflow) => workflow.workflowId?.includes(ONBOARDING_DEMO_WORKFLOW_ID));

      if (!workflow) {
        await createDemoWorkflow({ environment });
      }
    };

    initializeDemoWorkflow();
  }, [data, environment]);
}
