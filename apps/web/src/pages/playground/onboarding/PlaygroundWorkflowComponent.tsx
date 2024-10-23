import { useEffect, useState } from 'react';

import type { DiscoverStepOutput, DiscoverWorkflowOutput } from '@novu/framework/internal';
import { css, cx } from '@novu/novui/css';

import { HStack, VStack } from '@novu/novui/jsx';
import { BrowserScreenWrapper } from './TitleBarWrapper';
import { WorkflowBackgroundWrapper } from '../../../studio/components/workflows/node-view/WorkflowBackgroundWrapper';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { When } from '../../../components/utils/When';
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

  return (
    <BrowserScreenWrapper
      title={
        <div
          className={css({
            bg: 'legacy.B15',
            borderRadius: '25',
            lineHeight: '125',
            fontSize: '88',
            maxW: '392px',
            mx: 'auto',
          })}
        >
          http://localhost:2022/studio
        </div>
      }
    >
      <div
        className={cx(
          css({
            height: 'inherit',
            p: '75',
            pb: '0',
            bg: 'surface.page',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'hidden',
          })
        )}
      >
        <When truthy={!clickedStepId}>
          <WorkflowBackgroundWrapper>
            <When truthy={isBridgeAppLoading || isDemoWorkflow}>
              <VStack gap="0">
                <StepNode.LoadingDisplay />
                <StepNode.LoadingDisplay />
                <StepNode.LoadingDisplay />
              </VStack>
            </When>
            <When truthy={!(isBridgeAppLoading || isDemoWorkflow)}>
              <WorkflowNodes
                steps={steps || []}
                onStepClick={(stepClicked) => {
                  setWorkflowTab('stepEdit');
                  setClickedStepId(stepClicked.stepId);
                }}
                onTriggerClick={() => {}}
              />
            </When>
          </WorkflowBackgroundWrapper>
        </When>

        <When truthy={!!clickedStepId && step}>
          <div>
            <HStack
              className={css({
                my: '50',
                height: 'inherit',
                pl: '75',
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
