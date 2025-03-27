import { NewWorkflowDrawer } from '@/pages/new-workflow-drawer';
import { useParams } from 'react-router-dom';

export function DuplicateWorkflowPage() {
  const { workflowId } = useParams<{
    workflowId: string;
  }>();

  return <NewWorkflowDrawer mode="duplicate" workflowId={workflowId ?? undefined} />;
}
