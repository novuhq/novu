import { Button } from '@novu/novui';
import { IconOutlineEmail, IconPlayArrow } from '@novu/novui/icons';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../../constants/routes';
import { WorkflowsPageTemplate, WorkflowsPanelLayout } from './layout';
import { WorkflowStepEditorContentPanel } from './WorkflowStepEditorContentPanel';
import { WorkflowStepEditorInputsPanel } from './WorkflowStepEditorInputsPanel';

const title = 'Email step';
export const WorkflowsStepEditorPage = () => {
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
        <WorkflowStepEditorInputsPanel />
      </WorkflowsPanelLayout>
    </WorkflowsPageTemplate>
  );
};
