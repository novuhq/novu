import { HStack } from '@novu/novui/jsx';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import CodeEditor from '../../../studio/components/workflows/step-editor/editor/CodeEditor';
import { RunExpressApp } from '../../../studio/components/workflows/step-editor/editor/RunExpressApp';
import { useState } from 'react';
import { BRIDGE_CODE } from '../../../studio/components/workflows/step-editor/editor/bridge-code.const';
import { WorkflowNodes } from '../../../studio/components/workflows/node-view/WorkflowNodes';
import { parseUrl } from '../../../utils/routeUtils';
import { useDiscover } from '../../../studio/hooks';

export function OnboardingPage() {
  const [code, setCode] = useState(BRIDGE_CODE);

  return (
    <div>
      <HStack justify={'center'} style={{ width: '100%' }}>
        <div style={{ width: '100%' }}>
          <CodeEditor code={code} setCode={setCode} />
          <iframe></iframe>
        </div>
        <WorkflowTree />
      </HStack>
      <RunExpressApp code={code} />
    </div>
  );
}

export function WorkflowTree() {
  const { data, isLoading } = useDiscover();
  const navigate = useNavigate();

  // todo add bridge bootstrap as loading indication as well
  if (isLoading) {
    return <div style={{ width: '100%' }}> Loading...</div>;
  }

  if (!data?.workflows?.length || data?.workflows?.length === 0) {
    return <div style={{ width: '100%' }}> No workflow exist...</div>;
  }

  const { workflows } = data;
  const workflow = workflows[0];

  const workflowId = (workflow?._id as string) || (workflow?.workflowId as string);

  return (
    <div style={{ width: '100%' }}>
      <WorkflowNodes
        steps={
          workflow?.steps?.map((item) => {
            return {
              stepId: item.stepId,
              type: item.template?.type || item.type,
            };
          }) || []
        }
        onStepClick={(step) => {
          navigate(
            parseUrl(ROUTES.WORKFLOWS_V2_STEP_EDIT, {
              templateId: workflowId,
              stepId: step.stepId,
            })
          );
        }}
        onTriggerClick={() => {
          navigate(
            parseUrl(ROUTES.WORKFLOWS_V2_TEST, {
              templateId: workflowId,
            })
          );
        }}
      />
    </div>
  );
}
