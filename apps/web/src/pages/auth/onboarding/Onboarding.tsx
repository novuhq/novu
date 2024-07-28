import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
const { Pane } = Allotment;
const RootView = Allotment;
const EditorView = Allotment;

import { HStack } from '@novu/novui/jsx';
import { css } from '@novu/novui/css';
import { Button } from '@novu/novui';
import { IconPlayArrow } from '@novu/novui/icons';

import { ROUTES } from '../../../constants/routes';
import { useContainer } from '../../../studio/components/workflows/step-editor/editor/useContainer';
import { TerminalComponent } from '../../../studio/components/workflows/step-editor/editor/Terminal';
import { CodeEditor } from '../../../studio/components/workflows/step-editor/editor/CodeEditor';
import { WorkflowFlow } from './WorkflowFlow';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { OnBoardingAnalyticsEnum } from '../../quick-start/consts';
import { useWorkflowStepEditor } from '../../templates/editor_v2/useWorkflowStepEditor';
import { successMessage } from '../../../utils/notifications';
import { ExecutionDetailsModalWrapper } from '../../templates/components/ExecutionDetailsModalWrapper';

export function OnboardingPage() {
  const [clickedStepId, setClickedStepId] = useState<string>('');
  const { handleTestClick } = useWorkflowStepEditor(clickedStepId);

  return (
    <div
      className={css({
        bg: 'surface.panel',
        height: '100vh',
      })}
    >
      <Header handleTestClick={handleTestClick} />
      <Playground clickedStepId={clickedStepId} setClickedStepId={setClickedStepId} />
    </div>
  );
}

function Header({ handleTestClick }: { handleTestClick: () => Promise<any> }) {
  const navigate = useNavigate();
  const segment = useSegment();

  const handleContinue = () => {
    navigate(ROUTES.WORKFLOWS);
    segment.track(OnBoardingAnalyticsEnum.BRIDGE_PLAYGROUND_CONTINUE_CLICK, {
      // todo implement type [skip | get started]
      type: 'skip',
    });
  };

  return (
    <HStack
      justify={'space-between'}
      className={css({
        width: '100%',
        height: '44px',
        padding: '8px',
      })}
    >
      <HStack justify={'start'} gap={0}>
        <img
          src={`/static/images/novu-gray.svg`}
          className={css({
            h: '20px',
            w: '20px',
            borderRadius: '100',
            margin: '8px',
          })}
        />
        <span
          className={css({
            color: 'typography.text.secondary',
            fontSize: '14px',
            fontStyle: 'normal',
            fontWeight: '600',
            lineHeight: '20px',
            padding: '8px',
          })}
        >
          Playground
        </span>
      </HStack>
      <div>
        <Button size="sm" onClick={handleContinue}>
          Skip Playground
        </Button>
        <TriggerActionModal handleTestClick={handleTestClick} />
      </div>
    </HStack>
  );
}

function Playground({
  clickedStepId,
  setClickedStepId,
}: {
  clickedStepId: string;
  setClickedStepId: (stepId: string) => void;
}) {
  const { code, setCode, terminalRef, isBridgeAppLoading } = useContainer();
  const [editorSizes, setEditorSizes] = useState<number[]>([300, 200]);

  function handleEditorSizeChange() {
    window.dispatchEvent(new Event('nv-terminal-layout-resize'));
  }

  return (
    <RootView
      onChange={() => {
        handleEditorSizeChange();
      }}
      className={css({
        height: 'calc(100vh - 54px) !important',
        '--separator-border': 'transparent',
      })}
    >
      <EditorView
        vertical
        onVisibleChange={
          // eslint-disable-next-line no-console
          (visible) => console.log('visible ', visible)
        }
        onChange={(value) => {
          setEditorSizes(value);
          handleEditorSizeChange();
        }}
        defaultSizes={editorSizes}
        className={css({
          borderRadius: '8px 8px 8px 8px',
        })}
      >
        <Pane preferredSize={'70%'}>
          <div style={{ height: editorSizes?.[0], margin: '0 10px 0 10px' }}>
            <CodeEditor code={code} setCode={setCode} />
          </div>
        </Pane>
        <Pane preferredSize={'30%'}>
          <div style={{ margin: '0 10px 10px 10px', height: '100%' }}>
            <TerminalComponent height={String(editorSizes?.[1])} ref={terminalRef} />
          </div>
        </Pane>
      </EditorView>
      <Pane>
        <div
          style={{
            height: '100%',
            margin: '0 10px 10px 10px',
            borderRadius: '8px 8px 8px 8px',
          }}
        >
          <WorkflowFlow
            isBridgeAppLoading={isBridgeAppLoading}
            clickedStepId={clickedStepId}
            setClickedStepId={setClickedStepId}
          />
        </div>
      </Pane>
    </RootView>
    // </div>
  );
}

const TriggerActionModal = ({ handleTestClick }: { handleTestClick: () => Promise<any> }) => {
  const [transactionId, setTransactionId] = useState<string>('');
  const [executionModalOpened, { close: closeExecutionModal, open: openExecutionModal }] = useDisclosure(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOnRunTestClick = async () => {
    setIsLoading(true);
    try {
      const res = await handleTestClick();
      successMessage('Workflow triggered successfully');
      setTransactionId(res.data.transactionId);
      openExecutionModal();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        className={css({
          background: '#292933 !important',
        })}
        size="sm"
        Icon={IconPlayArrow}
        onClick={handleOnRunTestClick}
        loading={isLoading}
      >
        Run a test
      </Button>
      <ExecutionDetailsModalWrapper
        transactionId={transactionId}
        isOpen={executionModalOpened}
        onClose={closeExecutionModal}
      />
    </>
  );
};
