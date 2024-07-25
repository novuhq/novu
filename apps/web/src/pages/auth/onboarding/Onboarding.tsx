import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
const { Pane } = Allotment;

import { useColorScheme, Button } from '@novu/design-system';
import { HStack } from '@novu/novui/jsx';
import { css } from '@novu/novui/css';
import { IconClose, IconPlayArrow } from '@novu/novui/icons';

import { ROUTES } from '../../../constants/routes';
import { useContainer } from '../../../studio/components/workflows/step-editor/editor/useContainer';
import { TerminalComponent } from '../../../studio/components/workflows/step-editor/editor/Terminal';
import { CodeEditor } from '../../../studio/components/workflows/step-editor/editor/CodeEditor';
import { WorkflowFlow } from './WorkflowFlow';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { OnBoardingAnalyticsEnum } from '../../quick-start/consts';
import { OutlineButton } from '../../../studio/components/OutlineButton';
import { useWorkflowStepEditor } from '../../templates/editor_v2/useWorkflowStepEditor';
import { successMessage } from '../../../utils/notifications';
import { ExecutionDetailsModalWrapper } from '../../templates/components/ExecutionDetailsModalWrapper';

export function OnboardingPage() {
  const [clickedStepId, setClickedStepId] = useState<string>('');
  const { handleTestClick } = useWorkflowStepEditor(clickedStepId);

  return (
    <div
      className={css({
        bg: 'surface.page',
      })}
    >
      <Header handleTestClick={handleTestClick} />
      <Playground clickedStepId={clickedStepId} setClickedStepId={setClickedStepId} />
    </div>
  );
}

function Header({ handleTestClick }: { handleTestClick: () => Promise<any> }) {
  const { colorScheme } = useColorScheme();
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
      <span
        className={css({
          color: 'typography.text.secondary',
          fontFamily: 'SF Pro Text',
          fontSize: '14px',
          fontStyle: 'normal',
          fontWeight: '600',
          lineHeight: '20px',
        })}
      >
        Playground
      </span>
      <div>
        <TriggerActionModal handleTestClick={handleTestClick} />
        <Button
          variant="outline"
          onClick={handleContinue}
          icon={<IconClose />}
          iconPosition={'right'}
          className={css({
            height: '44px',
            padding: '8px',
            color: colorScheme === 'light' ? 'typography.text.primary' : 'typography.text.secondary',
          })}
        >
          Skip
        </Button>
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
  // const [playgroundSizes, setPlaygroundSizes] = useState<number[]>([479, 479]);

  return (
    <div
      className={css({
        bg: 'surface.page',
        height: '100vh',
        '--separator-border': 'transparent',
      })}
    >
      <Allotment
        // proportionalLayout
        onChange={(value) => {
          // eslint-disable-next-line no-console
          // console.log('playgroundSizes ', value);
          // setPlaygroundSizes(value);
        }}
        // defaultSizes={playgroundSizes}
      >
        <Allotment
          vertical
          onVisibleChange={
            // eslint-disable-next-line no-console
            (visible) => console.log('visible ', visible)
          }
          onChange={(value) => {
            // todo create memo
            // eslint-disable-next-line no-console
            console.log('editorSizes ', value);
            setEditorSizes(value);
            // console.log((terminalRef?.current as any)?.proposeDimensions.?());
            console.log((terminalRef?.current as any)?.proposeDimensions());
            // terminalRef?.current?.fit();
          }}
          defaultSizes={editorSizes}
        >
          <Pane preferredSize={'70%'}>
            <div style={{ height: editorSizes?.[0], margin: '10px 10px 0 10px' }}>
              <CodeEditor code={code} setCode={setCode} />
            </div>
          </Pane>
          <Pane preferredSize={'30%'}>
            <div style={{ height: editorSizes?.[1], margin: '0 10px 10px 10px' }}>
              <TerminalComponent ref={terminalRef} />
            </div>
          </Pane>
        </Allotment>
        <Pane>
          <div style={{ height: '100%', margin: '10px 10px 10px 10px' }}>
            <WorkflowFlow
              isBridgeAppLoading={isBridgeAppLoading}
              clickedStepId={clickedStepId}
              setClickedStepId={setClickedStepId}
            />
          </div>
        </Pane>
      </Allotment>
    </div>
  );
}

const TriggerActionModal = ({ handleTestClick }: { handleTestClick: () => Promise<any> }) => {
  const [transactionId, setTransactionId] = useState<string>('');
  const [executionModalOpened, { close: closeExecutionModal, open: openExecutionModal }] = useDisclosure(false);

  const handleOnRunTestClick = async () => {
    const res = await handleTestClick();
    successMessage('Workflow triggered successfully');
    setTransactionId(res.data.transactionId);
    openExecutionModal();
  };

  return (
    <>
      <OutlineButton Icon={IconPlayArrow} onClick={handleOnRunTestClick}>
        Run a test
      </OutlineButton>
      <ExecutionDetailsModalWrapper
        transactionId={transactionId}
        isOpen={executionModalOpened}
        onClose={closeExecutionModal}
      />
    </>
  );
};
