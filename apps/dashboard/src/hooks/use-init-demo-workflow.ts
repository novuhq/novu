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
            subject: '{{payload.subject}}',
            body: '{{payload.body}}',
            avatar: window.location.origin + '/images/novu.svg',
            primaryAction: {
              label: '{{payload.primaryActionLabel}}',
              redirect: {
                target: '_self',
                url: '/onboarding/inbox/embed',
              },
            },
            secondaryAction: {
              label: '{{payload.secondaryActionLabel}}',
              redirect: {
                target: '_self',
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
