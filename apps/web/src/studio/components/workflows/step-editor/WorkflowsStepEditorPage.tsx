import { Button } from '@novu/novui';
import { IconOutlineEmail, IconPlayArrow } from '@novu/novui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../../../../constants/routes';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from '../layout/index';
import { WorkflowStepEditorContentPanel } from './WorkflowStepEditorContentPanel';
import { WorkflowStepEditorInputsPanel } from './WorkflowStepEditorInputsPanel';
import { useQuery } from '@tanstack/react-query';
import { bridgeApi } from '../../../../api/bridge/bridge.api';

export const WorkflowsStepEditorPage = () => {
  const { templateId = '', stepId } = useParams<{ templateId: string; stepId: string }>();

  const { data: workflow, isLoading } = useQuery(['workflow', templateId], async () => {
    return bridgeApi.getWorkflow(templateId);
  });
  const step = workflow?.steps.find((item) => item.stepId === stepId);
  const title = step?.stepId;

  const navigate = useNavigate();
  const handleTestClick = () => {
    // TODO: this is just a temporary step for connecting the prototype
    navigate(ROUTES.STUDIO_FLOWS_TEST_STEP);
  };

  return (
    <WorkflowsPageTemplate
      title={title}
      icon={<IconOutlineEmail size="32" />}
      actions={
        <Button Icon={IconPlayArrow} variant="outline" onClick={handleTestClick}>
          Test workflow
        </Button>
      }
    >
      <WorkflowsPanelLayout>
        <WorkflowStepEditorContentPanel />
        <WorkflowStepEditorInputsPanel step={step} workflow={workflow} />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
