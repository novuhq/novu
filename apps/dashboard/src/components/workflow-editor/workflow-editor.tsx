import { Link, useParams } from 'react-router-dom';
import { useWatch, useFormContext } from 'react-hook-form';
import * as z from 'zod';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../primitives/tabs';
import { WorkflowCanvas } from './workflow-canvas';
import { workflowSchema } from './schema';
import { buildRoute, ROUTES } from '@/utils/routes';
import { ConfigureWorkflow } from './configure-workflow';

export const WorkflowEditor = () => {
  const { environmentId = '', workflowId = '' } = useParams<{ environmentId: string; workflowId: string }>();
  const form = useFormContext<z.infer<typeof workflowSchema>>();
  const steps = useWatch({
    control: form.control,
    name: 'steps',
  });

  return (
    <div className="flex h-full flex-1 flex-nowrap">
      <Tabs defaultValue="workflow" className="-mt-[1px] flex h-full flex-1 flex-col" value="workflow">
        <TabsList>
          <TabsTrigger value="workflow" asChild>
            <Link
              to={buildRoute(ROUTES.EDIT_WORKFLOW, {
                environmentId,
                workflowId,
              })}
            >
              Workflow
            </Link>
          </TabsTrigger>
          <TabsTrigger value="trigger" asChild>
            <Link
              to={buildRoute(ROUTES.TEST_WORKFLOW, {
                environmentId,
                workflowId,
              })}
            >
              Trigger
            </Link>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="workflow" className="mt-0 h-full w-full">
          {steps && <WorkflowCanvas steps={steps} />}
        </TabsContent>
      </Tabs>
      <ConfigureWorkflow />
    </div>
  );
};
