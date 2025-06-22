import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { TestWorkflowDrawer } from '@/components/workflow-editor/test-workflow/test-workflow-drawer';
import { useFetchWorkflowTestData } from '@/hooks/use-fetch-workflow-test-data';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';

export function TestWorkflowDrawerPage() {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const { workflowSlug } = useParams<{ workflowSlug: string }>();
  const { currentEnvironment } = useEnvironment();

  const { testData } = useFetchWorkflowTestData({
    workflowSlug: workflowSlug ?? '',
  });

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (!isOpen) {
      // Navigate to the parent workflow edit page to properly show the right menu
      if (currentEnvironment?.slug && workflowSlug) {
        navigate(
          buildRoute(ROUTES.EDIT_WORKFLOW, {
            environmentSlug: currentEnvironment.slug,
            workflowSlug: workflowSlug,
          }),
          { replace: true }
        );
      } else {
        navigate(-1);
      }
    }
  };

  return <TestWorkflowDrawer isOpen={open} onOpenChange={handleOpenChange} testData={testData} />;
}
