import { useParams } from 'react-router-dom';
import { NewWorkflowDrawer } from '@/pages/new-workflow-drawer';

export function DuplicateWorkflowPage() {
  const { workflowId } = useParams<{
    workflowId: string;
  }>();

  return <NewWorkflowDrawer mode="duplicate" workflowId={workflowId ?? undefined} />;
}
