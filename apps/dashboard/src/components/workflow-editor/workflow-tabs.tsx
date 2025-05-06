import { Link } from 'react-router-dom';

import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../primitives/tabs';
import { WorkflowCanvas } from './workflow-canvas';

export const WorkflowTabs = () => {
  const { workflow } = useWorkflow();
  const { currentEnvironment } = useEnvironment();

  return (
    <div className="flex h-full flex-1 flex-nowrap">
      <Tabs defaultValue="workflow" className="-mt-px flex h-full flex-1 flex-col" value="workflow">
        <TabsList variant="regular">
          <TabsTrigger value="workflow" asChild variant="regular">
            <Link
              to={buildRoute(ROUTES.EDIT_WORKFLOW, {
                environmentSlug: currentEnvironment?.slug ?? '',
                workflowSlug: workflow?.slug ?? '',
              })}
            >
              Workflow
            </Link>
          </TabsTrigger>
          <TabsTrigger value="trigger" asChild variant="regular">
            <Link
              to={buildRoute(ROUTES.TEST_WORKFLOW, {
                environmentSlug: currentEnvironment?.slug ?? '',
                workflowSlug: workflow?.slug ?? '',
              })}
            >
              Trigger
            </Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="workflow" className="mt-0 h-full w-full" variant="regular">
          <WorkflowCanvas steps={workflow?.steps || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
