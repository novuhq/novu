import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TestWorkflowDrawer } from '@/components/workflow-editor/test-workflow/test-workflow-drawer';
import { useFetchWorkflowTestData } from '@/hooks/use-fetch-workflow-test-data';

export function TestWorkflowDrawerPage() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const { workflowSlug } = useParams<{ workflowSlug: string }>();

  const { testData } = useFetchWorkflowTestData({
    workflowSlug: workflowSlug ?? '',
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) {
      navigate(-1);
    }
  };

  return <TestWorkflowDrawer isOpen={open} onOpenChange={handleOpenChange} testData={testData} />;
}
