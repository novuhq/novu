import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDisclosure } from '@mantine/hooks';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
const { Pane } = Allotment;
const RootView = Allotment;
const EditorView = Allotment;
import { Tooltip } from '@novu/design-system';

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
import Joyride, { CallBackProps, STATUS, Step } from 'react-joyride';
import { useStudioState } from '../../../studio/StudioStateProvider';
import { Accordion, Code, List } from '@mantine/core';
import { Tabs } from '@mantine/core';

export function PlaygroundPage() {
  const [clickedStepId, setClickedStepId] = useState<string>('');
  const { handleTestClick } = useWorkflowStepEditor(clickedStepId);
  const [runJoyride, setRunJoyride] = useState(true);
  const [joyStepIndex, setJoyStepIndex] = useState<number | undefined>(undefined);
  const { steps } = useWorkflowStepEditor(clickedStepId || '');

  const joyrideSteps: Step[] = [
    {
      target: '.code-editor',
      styles: {
        options: {
          width: '550px',
        },
      },
      title: 'Workflow Definition',
      content: (
        <div>
          <p className={css({ marginBottom: '15px !important' })}>
            This is your IDE where you can define your notification workflows. You can write various types, here are
            some common step types:
          </p>
          <Accordion
            classNames={{
              item: css({
                marginBottom: '0 !important',
              }),
            }}
          >
            <Accordion.Item value="email">
              <Accordion.Control>SMS</Accordion.Control>
              <Accordion.Panel>
                An SMS Step can be added to your workflow by using the following snippet:
                <Code block style={{ marginTop: '10px' }}>
                  {`await step.sms('sms-step', () => {
  return {
    body: 'Hello, world!',
  }
})`}
                </Code>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="inbox">
              <Accordion.Control>Inbox</Accordion.Control>
              <Accordion.Panel>
                An Inbox Step can be added to your workflow by using the following snippet:
                <Code block style={{ marginTop: '10px' }}>
                  {`await step.inApp('inApp-step', () => {
  return {
    body: 'Hello, world!',
  }
})`}
                </Code>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="digest">
              <Accordion.Control>Digest</Accordion.Control>
              <Accordion.Panel>
                A Digest Step can be added to your workflow by using the following snippet:
                <Code block style={{ marginTop: '10px' }}>
                  {`const { events } = await step.digest('digest-step', async () => {
    return {
        amount: 1,
        unit: 'hours'
    }
});`}
                </Code>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item value="delay">
              <Accordion.Control>Delay</Accordion.Control>
              <Accordion.Panel>
                A Delay Step can be added to your workflow by using the following snippet:
                <Code block style={{ marginTop: '10px' }}>
                  {`await step.delay('delay-step', () => {
  return {
    amount: 1,
    unit: 'hours'
  }
})`}
                </Code>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </div>
      ),
      placement: 'right',
      disableBeacon: false,
    },
    {
      title: 'Studio',
      target: '.workflow-flow',
      content:
        // eslint-disable-next-line max-len
        'Each modification in the code editor, will be reflected in the workflow view. You can preview notification content, design, logic and more visually.',
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: '.nv-tabs__root',
      title: 'Step controls',
      content:
        // eslint-disable-next-line max-len
        'Step controls are UI widget that are generated by your workflow definition, they can be used to modify the content, and behaviour of a workflow without changing your code.',
      placement: 'left',
      disableBeacon: true,
    },
    {
      target: '[data-test-id="trigger-test-button"]',
      title: 'Trigger a test',
      content:
        // eslint-disable-next-line max-len
        'You can now trigger your workflow, and see the email arriving to your inbox. After the workflow is triggered, you can see the execution logs in the modal.',
      placement: 'bottom',
      disableBeacon: true,
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, lifecycle, action } = data;

    if (action === 'next' && data.step.target === '.workflow-flow' && steps?.length && lifecycle === 'complete') {
      setRunJoyride(false);
      setJoyStepIndex(2);
      setClickedStepId(steps[0].stepId);

      setTimeout(() => {
        setRunJoyride(true);
      }, 300);
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRunJoyride(false);
    }

    if (status === STATUS.FINISHED && lifecycle === 'complete') {
      handleTestClick();
    }
  };

  return (
    <div
      className={css({
        bg: 'surface.panel',
        height: '100vh',
      })}
    >
      <Joyride
        stepIndex={joyStepIndex}
        steps={joyrideSteps}
        run={runJoyride}
        continuous
        showSkipButton
        showProgress={false}
        callback={handleJoyrideCallback}
        disableOverlayClose
        disableCloseOnEsc
        spotlightClicks
        hideCloseButton
        locale={{
          last: 'Trigger Workflow',
        }}
        styles={{
          tooltipContent: {
            textAlign: 'left',
          },
          options: {
            arrowColor: '#23232b',
            backgroundColor: '#23232b',
            primaryColor: '#dd2476',
            textColor: '#ffffff',
            zIndex: 1000,
          },
          buttonBack: {
            color: '#ffffff',
          },
        }}
      />

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

    segment.track('Playground Skip Clicked', {
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
        <Button
          size="sm"
          onClick={handleContinue}
          className={css({ color: '#828299 !important', '& span': { color: '#828299 !important' } })}
        >
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
          <div style={{ height: editorSizes?.[0], margin: '0 10px 0 10px' }} className="code-editor">
            <CodeEditor code={code} setCode={setCode} />
          </div>
        </Pane>
        <Pane preferredSize={'30%'}>
          <div style={{ margin: '0 10px 10px 10px', height: '100%' }} className="terminal-component">
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
          className="workflow-flow"
        >
          <WorkflowFlow
            isBridgeAppLoading={isBridgeAppLoading}
            clickedStepId={clickedStepId}
            setClickedStepId={setClickedStepId}
          />
        </div>
      </Pane>
    </RootView>
  );
}

const TriggerActionModal = ({ handleTestClick }: { handleTestClick: () => Promise<any> }) => {
  const studioState = useStudioState() || {};
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
      <Tooltip label={`Trigger a test of this workflow, delivered to: ${studioState?.testUser?.emailAddress} address`}>
        <Button
          data-test-id="trigger-test-button"
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
      </Tooltip>
      <ExecutionDetailsModalWrapper
        transactionId={transactionId}
        isOpen={executionModalOpened}
        onClose={closeExecutionModal}
      />
    </>
  );
};
