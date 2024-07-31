import { useState, useEffect } from 'react';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';
const { Pane } = Allotment;
const RootView = Allotment;
const EditorView = Allotment;
import { css } from '@novu/novui/css';

import { useContainer } from '../../../studio/components/workflows/step-editor/editor/useContainer';
import { TerminalComponent } from '../../../studio/components/workflows/step-editor/editor/Terminal';
import { CodeEditor } from '../../../studio/components/workflows/step-editor/editor/CodeEditor';
import { PlaygroundWorkflowComponent } from './PlaygroundWorkflowComponent';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useStudioState } from '../../../studio/StudioStateProvider';
import { useEffectOnce } from '../../../hooks/useEffectOnce';
import useThemeChange from '../../../hooks/useThemeChange';
import { useDiscover } from '../../../studio/hooks/useBridgeAPI';
import { DiscoverStepOutput, DiscoverWorkflowOutput } from '@novu/framework';
import { API_ROOT } from '../../../config/index';
import { useAPIKeys } from '../../../hooks/useApiKey';
import { TourGuideComponent } from './PlaygroundTourGuide';
import { Header } from './PlaygroundHeader';

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
  const { testUser, bridgeURL } = useStudioState();

  const { data: discover } = useDiscover();

  const workflow = discover?.workflows?.[0];
  const steps = workflow?.steps;

  const { initializeWebContainer, isBridgeAppLoading } = useContainer();
  const { toggleColorScheme, colorScheme } = useThemeChange();
  const segment = useSegment();

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

    initializeWebContainer();
  }, true);

  useEffect(() => {
    if (colorScheme === 'light') {
      toggleColorScheme();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorScheme]);

  return (
    <div
      className={css({
        bg: 'surface.panel',
        height: '100vh',
      })}
    >
      <TourGuideComponent setClickedStepId={setClickedStepId} steps={steps} isBridgeAppLoading={isBridgeAppLoading} />
      <Header handleTestClick={handleTestClick} />

      <Playground
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
}: {
  clickedStepId: string;
  setClickedStepId: (stepId: string) => void;
  onStateChange: (state: { workflowId?: string; stepId?: string; controls: any; payload: any }) => void;
  workflow?: DiscoverWorkflowOutput;
  steps?: DiscoverStepOutput[];
}) {
  const { code, setCode, terminalRef, isBridgeAppLoading } = useContainer();
  const filteredCode = Object.fromEntries(Object.entries(code).filter(([key]) => key !== 'tunnel.ts'));

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
        defaultSizes={editorSizes}
        className={css({
          borderRadius: '8px 8px 8px 8px',
        })}
      >
        <Pane preferredSize={'70%'}>
          <div style={{ height: editorSizes?.[0], margin: '0 10px 0 10px' }} className="code-editor">
            <CodeEditor files={filteredCode} setFiles={setCode} />
          </div>
        </Pane>
        <Pane preferredSize={'30%'}>
          <div style={{ margin: '0 10px 10px 10px', height: '100%' }} className="terminal-component">
            <TerminalComponent height={String(editorSizes?.[1])} ref={terminalRef} />
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
