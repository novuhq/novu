import { useState } from 'react';
import { HStack } from '@novu/novui/jsx';

import CodeEditor from '../../../studio/components/workflows/step-editor/editor/CodeEditor';
import { RunExpressApp } from '../../../studio/components/workflows/step-editor/editor/RunExpressApp';
import { BRIDGE_CODE } from '../../../studio/components/workflows/step-editor/editor/bridge-code.const';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { useDiscover } from '../../../studio/hooks';
import { WorkflowsStepEditorPageV2 } from '../../templates/editor_v2/TemplateStepEditorV2';

export function OnboardingPage() {
  const [code, setCode] = useState(BRIDGE_CODE);

  return (
    <div>
      <HStack justify={'center'} style={{ width: '100%' }}>
        <div style={{ width: '100%' }}>
          <CodeEditor code={code} setCode={setCode} />
        </div>
        <WorkflowFlow />
      </HStack>
      <RunExpressApp code={code} />
    </div>
  );
}

export function WorkflowFlow() {
  const [workflowTab, setWorkflowTab] = useState<'workflow' | 'stepEdit'>('workflow');
  const [clickedStepId, setClickedStepId] = useState<string | null>(null);
  const { data, isLoading } = useDiscover();

  // todo add bridge bootstrap as loading indication as well
  if (isLoading) {
    return <div style={{ width: '100%' }}> Loading...</div>;
  }

  if (!data?.workflows?.length) {
    return <div style={{ width: '100%' }}> No workflow exist...</div>;
  }

  const { workflows } = data;
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
