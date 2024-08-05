import { useState, useEffect } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
const { Pane } = Allotment;
const RootView = Allotment;
const EditorView = Allotment;

import { css } from '@novu/novui/css';
import { DiscoverStepOutput, DiscoverWorkflowOutput } from '@novu/framework';

import { TerminalComponent } from './Terminal';
import { CodeEditor } from './CodeEditor';
import { PlaygroundWorkflowComponent } from './PlaygroundWorkflowComponent';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useStudioState } from '../../../studio/StudioStateProvider';
import { useEffectOnce } from '../../../hooks/useEffectOnce';
import useThemeChange from '../../../hooks/useThemeChange';
import { useDiscover } from '../../../studio/hooks/useBridgeAPI';
import { API_ROOT } from '../../../config/index';
import { useAPIKeys } from '../../../hooks/useApiKey';
import { TourGuideComponent } from './PlaygroundTourGuide';
import { Header } from './PlaygroundHeader';
import { useContainer } from '../../../hooks/useContainer';

export function PlaygroundPage() {
  const { apiKey } = useAPIKeys();

  const [triggerState, setTriggerState] = useState<{
    workflowId?: string;
    stepId?: string;
    controls: any;
    payload: any;
  }>({
    workflowId: '',
    stepId: '',
    controls: {},
    payload: {},
  });
  const [clickedStepId, setClickedStepId] = useState<string>('');
  const { testUser, bridgeURL, setBridgeURL } = useStudioState();

  const { data: discover, refetch } = useDiscover();

  const workflow = discover?.workflows?.[0];
  const steps = workflow?.steps;

  const { initializeWebContainer, isBridgeAppLoading, containerBridgeUrl } = useContainer();
  const { toggleColorScheme, colorScheme } = useThemeChange();
  const segment = useSegment();

  const [runJoyride, setRunJoyride] = useState<boolean>(false);
  const [joyStepIndex, setJoyStepIndex] = useState<number>(0);

  async function handleTestClick() {
    const res = await fetch(`${API_ROOT}/v1/events/trigger`, {
      method: 'POST',
      body: JSON.stringify({
        bridgeUrl: bridgeURL,
        name: 'hello-world',
        to: { subscriberId: testUser.id, email: testUser.emailAddress },
        payload: { ...triggerState.payload, __source: 'studio-onboarding-test-workflow' },
        controls: {
          steps: {
            [triggerState.stepId as string]: triggerState.controls,
          },
        },
      }),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `ApiKey ${apiKey}`,
      },
    });

    return await res.json();
  }

  useEffectOnce(() => {
    segment.track('Visit Playground page - [Playground]');

    if (containerBridgeUrl) {
      setBridgeURL(containerBridgeUrl);
      setTimeout(() => {
        refetch();
      }, 500);
    }

    initializeWebContainer();
  }, true);

  useEffect(() => {
    if (containerBridgeUrl && containerBridgeUrl !== bridgeURL) {
      setBridgeURL(containerBridgeUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeURL, containerBridgeUrl]);

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridgeURL]);

  useEffect(() => {
    window.addEventListener('webcontainer:serverReady', () => {
      if (bridgeURL !== containerBridgeUrl && containerBridgeUrl) {
        setBridgeURL(containerBridgeUrl);
      }

      refetch();
    });

    return () => {
      window.removeEventListener('webcontainer:serverReady', () => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (colorScheme === 'light') {
      toggleColorScheme();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorScheme]);

  function onStepAddGuide() {
    setRunJoyride(true);
    setJoyStepIndex(1); // Set to index 1 (second step)
  }

  return (
    <div
      className={css({
        bg: 'surface.panel',
        height: '100vh',
      })}
    >
      <TourGuideComponent
        setClickedStepId={setClickedStepId}
        steps={steps}
        isBridgeAppLoading={isBridgeAppLoading}
        runJoyride={runJoyride}
        setRunJoyride={setRunJoyride}
        joyStepIndex={joyStepIndex}
        setJoyStepIndex={setJoyStepIndex}
      />
      <Header handleTestClick={handleTestClick} />

      <Playground
        onStepAddGuide={onStepAddGuide}
        clickedStepId={clickedStepId}
        setClickedStepId={setClickedStepId}
        onStateChange={setTriggerState}
        workflow={workflow}
        steps={steps}
      />
    </div>
  );
}

function Playground({
  clickedStepId,
  setClickedStepId,
  onStateChange,
  workflow,
  steps,
  onStepAddGuide,
}: {
  clickedStepId: string;
  setClickedStepId: (stepId: string) => void;
  onStateChange: (state: { workflowId?: string; stepId?: string; controls: any; payload: any }) => void;
  workflow?: DiscoverWorkflowOutput;
  steps?: DiscoverStepOutput[];
  onStepAddGuide?: () => void;
}) {
  const { code, setCode, terminalRef, isBridgeAppLoading } = useContainer();
  const filteredCode = Object.fromEntries(Object.entries(code).filter(([key]) => key !== 'tunnel.ts'));

  useEffectOnce(() => {
    setTimeout(() => {
      if (terminalRef.current) {
        terminalRef.current.write(
          '\nWelcome to the Novu Playground! Feel free to edit the code above and see the results in the editor on the right side\n\n'
        );
      }
    }, 1000);
  }, !isBridgeAppLoading);

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
        onChange={(value) => {
          setEditorSizes(value);
          handleEditorSizeChange();
        }}
        className={css({
          borderRadius: '8px 8px 8px 8px',
        })}
      >
        <Pane preferredSize={'80%'}>
          <div style={{ height: editorSizes?.[0], margin: '0 10px 0 10px' }} className="code-editor">
            <CodeEditor files={filteredCode} setFiles={setCode} />
          </div>
        </Pane>
        <Pane preferredSize={'20%'}>
          <div style={{ margin: '0 10px 10px 10px', height: '100%' }} className="terminal-component">
            <TerminalComponent height={String(editorSizes?.[1])} ref={terminalRef} onStepAddGuide={onStepAddGuide} />
          </div>
        </Pane>
      </EditorView>
      <Pane preferredSize={'60%'}>
        <div
          style={{
            height: '100%',
            margin: '0 10px 10px 10px',
            borderRadius: '8px 8px 8px 8px',
          }}
          className="workflow-flow"
        >
          <PlaygroundWorkflowComponent
            workflow={workflow}
            steps={steps}
            onStateChange={onStateChange}
            isBridgeAppLoading={isBridgeAppLoading}
            clickedStepId={clickedStepId}
            setClickedStepId={setClickedStepId}
          />
        </div>
      </Pane>
    </RootView>
  );
}
