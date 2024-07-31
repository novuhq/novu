import React, { useEffect, useState } from 'react';

import type { DiscoverStepOutput, DiscoverWorkflowOutput } from '@novu/framework';
import { css, cx } from '@novu/novui/css';

import { TitleBarWrapper } from './TitleBarWrapper';
import { WorkflowBackgroundWrapper } from '../../../studio/components/workflows/node-view/WorkflowBackgroundWrapper';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { When } from '../../../components/utils/When';
import { Flex, Stack, VStack } from '@novu/novui/jsx';
import { StepNode } from '../../../studio/components/workflows/node-view/StepNode';
import { WorkflowsStepEditor, WorkflowsStepEditorPage } from '../../../studio/components/workflows/index';
import { useWorkflowPreview } from '../../../studio/hooks/useBridgeAPI';
import { useSegment } from '../../../components/providers/SegmentProvider';

export function WorkflowFlow({
  isBridgeAppLoading,
  clickedStepId,
  setClickedStepId,
  onStateChange,
  workflow,
  steps,
}: {
  isBridgeAppLoading: boolean;
  clickedStepId: string;
  setClickedStepId: (stepId: string) => void;
  onStateChange: (state: { workflowId: string; stepId: string; controls: any; payload: any }) => void;
  workflow: DiscoverWorkflowOutput;
  steps: DiscoverStepOutput[];
  loading?: boolean;
}) {
  const segment = useSegment();
  const [controls, setStepControls] = useState({});
  const [payload, setPayload] = useState({});

  const {
    data: preview,
    isLoading: loadingPreview,
    refetch,
    error,
  } = useWorkflowPreview(
    { workflowId: workflow?.workflowId, stepId: clickedStepId, controls, payload },
    {
      refetchOnWindowFocus: 'always',
    }
  );

  function onControlsChange(type: string, form: any, id?: string) {
    switch (type) {
      case 'step':
        segment.track('Step Controls Changes', {
          key: id,
          origin: 'playground',
        });
        setStepControls(form.formData);
        break;
      case 'payload':
        setPayload(form.formData);
        break;
    }

    refetch();
  }

  const step = workflow?.steps.find((item) => item.stepId === clickedStepId);

  const [workflowTab, setWorkflowTab] = useState<'workflow' | 'stepEdit'>('workflow');

  const isDemoWorkflow = (workflow as DiscoverWorkflowOutput)?.workflowId.includes('demo');

  useEffect(() => {
    if (!onStateChange) return;

    onStateChange({
      workflowId: workflow?.workflowId,
      stepId: clickedStepId,
      controls,
      payload,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow, controls, payload, clickedStepId]);

  if (isBridgeAppLoading || isDemoWorkflow) {
    return <StepNodeSkeleton />;
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
          http://localhost:2022/studio
        </div>
      }
    >
      <div
        className={cx(
          css({
            borderRadius: '0 0 8px 8px',
            height: 'inherit',
            padding: '12px 0px 12px 12px',
            backgroundColor: '#1e1e27',
          })
        )}
      >
        <When truthy={!clickedStepId}>
          <WorkflowBackgroundWrapper>
            <WorkflowNodes
              steps={steps}
              onStepClick={(stepClicked) => {
                setWorkflowTab('stepEdit');
                setClickedStepId(stepClicked.stepId);
              }}
              onTriggerClick={() => {}}
            />
          </WorkflowBackgroundWrapper>
        </When>

        <When truthy={!!clickedStepId && step}>
          <WorkflowsStepEditor
            step={step}
            preview={preview}
            error={error}
            loadingPreview={loadingPreview}
            workflow={workflow}
            controls={controls}
            onControlsChange={onControlsChange}
            source="playground"
            onGoBack={() => {
              setWorkflowTab('workflow');
              setClickedStepId('');
            }}
          />
        </When>
      </div>
    </TitleBarWrapper>
  );
}

function StepNodeSkeleton() {
  return (
    <WorkflowBackgroundWrapper>
      <VStack gap="0" p="75">
        <StepNode.LoadingDisplay />
        <StepNode.LoadingDisplay />
        <StepNode.LoadingDisplay />
      </VStack>
    </WorkflowBackgroundWrapper>
  );
}
