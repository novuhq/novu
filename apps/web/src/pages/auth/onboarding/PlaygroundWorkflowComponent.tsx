import React, { useEffect, useState } from 'react';

import type { DiscoverStepOutput, DiscoverWorkflowOutput } from '@novu/framework';
import { css, cx } from '@novu/novui/css';

import { BrowserScreenWrapper } from './TitleBarWrapper';
import { WorkflowBackgroundWrapper } from '../../../studio/components/workflows/node-view/WorkflowBackgroundWrapper';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { When } from '../../../components/utils/When';
import { HStack, VStack } from '@novu/novui/jsx';
import { StepNode } from '../../../studio/components/workflows/node-view/StepNode';
import { useBridgeAPI } from '../../../studio/hooks/useBridgeAPI';
import { useControlsHandler } from '../../../hooks/workflow/useControlsHandler';
import { WorkflowsStepEditor } from '../../../components/workflow_v2/StepEditorComponent';
import { BackButton } from '../../../components/layout/components/LocalStudioHeader/BackButton';

export function PlaygroundWorkflowComponent({
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
  onStateChange: (state: { workflowId?: string; stepId: string; controls: any; payload: any }) => void;
  workflow?: DiscoverWorkflowOutput;
  steps?: DiscoverStepOutput[];
  loading?: boolean;
}) {
  const bridgeApi = useBridgeAPI();

  const {
    preview,
    isLoading: loadingPreview,
    error,
    controls,
    onControlsChange,
    payload,
    fetchPreview,
  } = useControlsHandler(
    (data) => bridgeApi.getStepPreview(data),
    workflow?.workflowId as string,
    clickedStepId,
    'playground'
  );

  useEffect(() => {
    window.addEventListener('webcontainer:serverReady', () => {
      fetchPreview();
    });

    return () => {
      window.removeEventListener('webcontainer:serverReady', () => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <BrowserScreenWrapper
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
            padding: '12px 12px 12px 0',
            backgroundColor: '#1e1e27',
          })
        )}
      >
        <When truthy={!clickedStepId}>
          <WorkflowBackgroundWrapper>
            <WorkflowNodes
              steps={steps || []}
              onStepClick={(stepClicked) => {
                setWorkflowTab('stepEdit');
                setClickedStepId(stepClicked.stepId);
              }}
              onTriggerClick={() => {}}
            />
          </WorkflowBackgroundWrapper>
        </When>

        <When truthy={!!clickedStepId && step}>
          <div>
            <HStack
              className={css({
                marginTop: '8px',
                marginBottom: '8px',
                height: 'inherit',
                borderRadius: '0 8px 8px 0',
                paddingLeft: '12px',
              })}
            >
              <BackButton
                styles={{
                  paddingLeft: '0',
                  paddingRight: '0',
                  _hover: { '& p, & svg': { color: 'typography.text.main !important' } },
                }}
                onClick={() => {
                  setWorkflowTab('workflow');
                  setClickedStepId('');
                }}
              />
            </HStack>
            <WorkflowsStepEditor
              step={step}
              preview={preview}
              error={error}
              loadingPreview={loadingPreview}
              workflow={workflow}
              defaultControls={controls}
              onControlsChange={onControlsChange}
              source="playground"
            />
          </div>
        </When>
      </div>
    </BrowserScreenWrapper>
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
