import { css } from '@novu/novui/css';
import { FC, useEffect, useState } from 'react';
import { IBridgeWorkflow } from '../../../../studio/types';
import { LocalStudioSidebarContent } from './LocalStudioSidebarContent';

export const LocalStudioSidebar: FC = () => {
  const { isLoading, workflows } = useBridgeWorkflows();

  return (
    <aside
      className={css({
        position: 'sticky',
        top: 0,
        zIndex: 'auto',
        backgroundColor: 'transparent',
        borderRight: 'none',
        width: '272px',
        height: '100%',
        p: '50',
        bg: 'surface.panel',
        overflowY: 'auto',
      })}
    >
      <LocalStudioSidebarContent workflows={workflows} isLoading={isLoading} />
    </aside>
  );
};

function useBridgeWorkflows() {
  const [workflows, setWorkflows] = useState<IBridgeWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchWorkflows() {
      try {
        const data = await getBridgeWorkflows();
        setWorkflows(data);
      } catch (error) {
        console.error('Error fetching workflows:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkflows();
  }, []);

  return { workflows, isLoading };
}

// TODO: remove -- just used for seeing structure
async function getBridgeWorkflows(): Promise<IBridgeWorkflow[]> {
  const bridgeWorkflows: IBridgeWorkflow[] = [
    {
      workflowId: 'onboarding',
      code: 'WF001',
      steps: [
        { stepId: 'welcome', type: 'email' },
        { stepId: 'tutorial', type: 'in_app' },
        { stepId: 'followup', type: 'push' },
      ],
    },
    {
      workflowId: 'orderConf',
      code: 'WF002',
      steps: [
        { stepId: 'confirm', type: 'email' },
        { stepId: 'tracking', type: 'sms' },
      ],
    },
    {
      workflowId: 'feedback',
      code: 'WF003',
      steps: [
        { stepId: 'request', type: 'in_app' },
        { stepId: 'reminder', type: 'push' },
        { stepId: 'thankYou', type: 'email' },
      ],
    },
    {
      workflowId: 'support',
      code: 'WF004',
      steps: [
        { stepId: 'ticket', type: 'chat' },
        { stepId: 'survey', type: 'email' },
      ],
    },
    {
      workflowId: 'promo',
      code: 'WF005',
      steps: [
        { stepId: 'announce', type: 'push' },
        { stepId: 'details', type: 'email' },
        { stepId: 'reminder', type: 'sms' },
      ],
    },
    {
      workflowId: 'newsletter',
      code: 'WF006',
      steps: [
        { stepId: 'compile', type: 'digest' },
        { stepId: 'send', type: 'email' },
      ],
    },
    {
      workflowId: 'reactivate',
      code: 'WF007',
      steps: [
        { stepId: 'initial', type: 'email' },
        { stepId: 'wait', type: 'delay' },
        { stepId: 'followup', type: 'push' },
      ],
    },
    {
      workflowId: 'eventRSVP',
      code: 'WF008',
      steps: [
        { stepId: 'invite', type: 'email' },
        { stepId: 'confirm', type: 'sms' },
        { stepId: 'remind', type: 'push' },
      ],
    },
    {
      workflowId: 'upgrade',
      code: 'WF009',
      steps: [
        { stepId: 'offer', type: 'in_app' },
        { stepId: 'explain', type: 'email' },
        { stepId: 'callback', type: 'custom' },
      ],
    },
    {
      workflowId: 'winback',
      code: 'WF010',
      steps: [
        { stepId: 'reachOut', type: 'email' },
        { stepId: 'wait', type: 'delay' },
        { stepId: 'discount', type: 'sms' },
        { stepId: 'lastCall', type: 'push' },
      ],
    },
  ];

  // Generate a random delay between 1000 and 3000 milliseconds (1 to 3 seconds)
  const delay = Math.floor(Math.random() * 2000) + 1000;

  // Return a promise that resolves with the bridgeWorkflows array after the random delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(bridgeWorkflows);
    }, delay);
  });
}
