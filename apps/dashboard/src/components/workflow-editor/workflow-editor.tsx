import { useWatch, useFormContext } from 'react-hook-form';
import * as z from 'zod';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '../primitives/tabs';
import { WorkflowCanvas } from './workflow-canvas';
import { formSchema } from './schema';

export const WorkflowEditor = () => {
  const form = useFormContext<z.infer<typeof formSchema>>();
  const steps = useWatch({
    control: form.control,
    name: 'steps',
  });

  return (
    <Tabs defaultValue="workflow" className="-mt-[1px] flex h-full flex-1 flex-col">
      <TabsList>
        <TabsTrigger value="workflow">Workflow</TabsTrigger>
      </TabsList>
      <TabsContent value="workflow" className="mt-0 h-full w-full">
        {steps && <WorkflowCanvas steps={steps} />}
      </TabsContent>
    </Tabs>
  );
};
