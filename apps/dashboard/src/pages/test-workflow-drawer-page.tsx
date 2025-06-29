import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TestWorkflowDrawer } from '@/components/workflow-editor/test-workflow/test-workflow-drawer';

export function TestWorkflowDrawerPage() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) {
      navigate(-1);
    }
  };

  return <TestWorkflowDrawer isOpen={open} onOpenChange={handleOpenChange} />;
}
