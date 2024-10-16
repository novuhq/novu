import { useForm } from 'react-hook-form';
// eslint-disable-next-line
// @ts-ignore
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate, useParams } from 'react-router-dom';

import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { Form } from '../primitives/form/form';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useEnvironment } from '@/context/environment/hooks';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../primitives/tabs';
import { WorkflowCanvas } from './workflow-canvas';
import { StepTypeEnum } from '@/utils/enums';

const formSchema = z.object({
  name: z.string(),
  identifier: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  active: z.boolean().optional(),
  critical: z.boolean().optional(),
  steps: z.array(
    z.object({
      name: z.string().optional(),
      type: z.nativeEnum(StepTypeEnum),
    })
  ),
});

export const WorkflowEditor = () => {
  const { currentEnvironment } = useEnvironment();
  const { workflowId } = useParams<{ workflowId?: string }>();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({ mode: 'onSubmit', resolver: zodResolver(formSchema) });
  const { handleSubmit, reset } = form;

  const { workflow } = useFetchWorkflow({
    workflowId,
    onSuccess: (data) => {
      reset(data);
    },
    onError: () => {
      navigate(buildRoute(ROUTES.WORKFLOWS, { environmentId: currentEnvironment?._id ?? '' }));
    },
  });

  const onSubmit = async (_data: z.infer<typeof formSchema>) => {
    // TODO: Implement submit logic
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="h-full">
        <Tabs defaultValue="workflow" className="-mt-[1px] flex h-full flex-col">
          <TabsList>
            <TabsTrigger value="workflow">Workflow</TabsTrigger>
          </TabsList>
          <TabsContent value="workflow" className="mt-0 h-full w-full">
            {workflow && <WorkflowCanvas steps={workflow.steps} />}
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
};
