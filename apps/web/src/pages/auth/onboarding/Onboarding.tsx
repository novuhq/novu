import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Allotment } from 'allotment';
import 'allotment/dist/style.css';

import { useColorScheme } from '@novu/design-system';
import { HStack } from '@novu/novui/jsx';
import { css } from '@novu/novui/css';
import { IconClose } from '@novu/novui/icons';

import CodeEditor from '../../../studio/components/workflows/step-editor/editor/CodeEditor';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { useDiscover } from '../../../studio/hooks';
import { WorkflowsStepEditorPageV2 } from '../../templates/editor_v2/TemplateStepEditorV2';
import { COMPANY_LOGO_TEXT_PATH, COMPANY_LOGO_TEXT_PATH_DARK_TEXT } from '../../../constants/assets';
import { useTelemetry } from '../../../hooks/useNovuAPI';
import { ROUTES } from '../../../constants/routes';
import { useContainer } from '../../../studio/components/workflows/step-editor/editor/useContainer';
import { TerminalComponent } from '../../../studio/components/workflows/step-editor/editor/Terminal';
const { Pane } = Allotment;

export function OnboardingPage() {
  return (
    <div
      className={css({
        bg: 'surface.page',
      })}
    >
      <Header />
      <Playground />
    </div>
  );
}

function Header() {
  const track = useTelemetry();
  const { colorScheme } = useColorScheme();

  return (
    <HStack
      className={css({
        padding: '32px',
      })}
    >
      <div className={css({ width: '100%', height: '375' })}>
        <img
          // TODO: these assets are not the same dimensions!
          src={colorScheme === 'dark' ? COMPANY_LOGO_TEXT_PATH : COMPANY_LOGO_TEXT_PATH_DARK_TEXT}
          className={css({
            h: '200',
          })}
        />
      </div>
      <Link
        to={ROUTES.WORKFLOWS}
        onClick={() => {
          track('Skip Onboarding Clicked', { location: 'x-icon' });
        }}
        className={css({
          position: 'relative',
          top: '-16px',
          right: '-16px',
        })}
      >
        <IconClose />
      </Link>
    </HStack>
  );
}

function Playground() {
  const { code, setCode, terminalRef } = useContainer();

  return (
    <div style={{ height: '100vh' }}>
      <Allotment>
        <Allotment vertical>
          <Pane>
            <CodeEditor code={code} setCode={setCode} />
          </Pane>
          <Pane>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <TerminalComponent ref={terminalRef} />
            </div>
          </Pane>
        </Allotment>
        <Pane>
          <WorkflowFlow />
        </Pane>
      </Allotment>
    </div>
  );
}

export function WorkflowFlow() {
  const [workflowTab, setWorkflowTab] = useState<'workflow' | 'stepEdit'>('workflow');
  const [clickedStepId, setClickedStepId] = useState<string | null>(null);
  const { data: discoverData, isLoading } = useDiscover();

  // todo add bridge bootstrap as loading indication as well
  if (isLoading) {
    return <div style={{ width: '100%' }}> Loading...</div>;
  }

  if (!discoverData?.workflows?.length) {
    return <div style={{ width: '100%' }}> No workflow exist...</div>;
  }

  const { workflows } = discoverData;
  const workflow = workflows[0];
  const workflowId = workflow?.workflowId as string;
  const steps =
    workflow?.steps?.map((item) => {
      return {
        stepId: item.stepId,
        type: item.type,
      };
    }) || [];

  if (workflowTab === 'workflow') {
    return (
      <div style={{ width: '100%' }}>
        <WorkflowNodes
          steps={steps}
          onStepClick={(step) => {
            setWorkflowTab('stepEdit');
            setClickedStepId(step.stepId);
          }}
          onTriggerClick={() => {}}
        />
      </div>
    );
  }

  if (workflowTab === 'stepEdit') {
    return (
      <div style={{ width: '100%' }}>
        <WorkflowsStepEditorPageV2 workflowId={workflowId} stepId={clickedStepId ?? ''} workflow={workflow} />;
      </div>
    );
  }

  return null;
}
