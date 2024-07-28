import React, { useState } from 'react';

import type { DiscoverWorkflowOutput } from '@novu/framework';
import { css, cx } from '@novu/novui/css';

import { TitleBarWrapper } from './TitleBarWrapper';
import { WorkflowBackgroundWrapper } from '../../../studio/components/workflows/node-view/WorkflowBackgroundWrapper';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { WorkflowsStepEditorPageV2 } from '../../templates/editor_v2/TemplateStepEditorV2';
import { useWorkflowStepEditor } from '../../templates/editor_v2/useWorkflowStepEditor';
import { When } from '../../../components/utils/When';

export function WorkflowFlow({
  isBridgeAppLoading,
  clickedStepId,
  setClickedStepId,
}: {
  isBridgeAppLoading: boolean;
  clickedStepId: string;
  setClickedStepId: (stepId: string) => void;
}) {
  const [workflowTab, setWorkflowTab] = useState<'workflow' | 'stepEdit'>('workflow');
  const { workflow, isDiscoverLoading, steps } = useWorkflowStepEditor(clickedStepId || '');

  if (isDiscoverLoading || isBridgeAppLoading) {
    return <div> Loading...</div>;
  }

  if (!workflow) {
    return <div> Workflow not exist...</div>;
  }

  return (
    <TitleBarWrapper
      title={
        <div
          className={css({
            backgroundColor: '#1E1E26',
            borderRadius: '6px',
            maxWidth: '392px',
            margin: '0 auto',
            lineHeight: '20px',
            fontSize: '14px !important',
          })}
        >
          https://dashboard.novu.co
        </div>
      }
    >
      <div className={cx(css({ borderRadius: '0 0 8px 8px', height: 'inherit', padding: '12px 0px 12px 12px' }))}>
        <When truthy={workflowTab === 'workflow'}>
          <WorkflowBackgroundWrapper>
            <WorkflowNodes
              steps={steps}
              onStepClick={(step) => {
                setWorkflowTab('stepEdit');
                setClickedStepId(step.stepId);
              }}
              onTriggerClick={() => {}}
            />
          </WorkflowBackgroundWrapper>
        </When>

        <When truthy={workflowTab === 'stepEdit'}>
          <WorkflowsStepEditorPageV2
            stepId={clickedStepId ?? ''}
            workflow={workflow as DiscoverWorkflowOutput}
            handleGoBack={() => setWorkflowTab('workflow')}
          />
        </When>
      </div>
    </TitleBarWrapper>
  );
}
