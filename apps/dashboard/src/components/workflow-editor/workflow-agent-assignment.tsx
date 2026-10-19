import { EnvironmentTypeEnum } from '@novu/shared';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { WorkflowAgentAssignmentForm } from './workflow-agent-assignment-form';

export function WorkflowAgentAssignment() {
  const { workflow, update } = useWorkflow();
  const { currentEnvironment } = useEnvironment();

  if (!workflow) {
    return null;
  }

  const isReadOnly = currentEnvironment?.type !== EnvironmentTypeEnum.DEV;

  return <WorkflowAgentAssignmentForm workflow={workflow} update={update} isReadOnly={isReadOnly} />;
}
