import { ReactNode, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
// eslint-disable-next-line
// @ts-ignore
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import type { StepDto } from '@novu/shared';

import { WorkflowEditorContext } from './workflow-editor-context';
import { StepTypeEnum } from '@/utils/enums';
import { useFetchWorkflow } from '@/hooks/use-fetch-workflow';
import { Form } from '../primitives/form/form';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useEnvironment } from '@/context/environment/hooks';
import { formSchema } from './schema';

const STEP_NAME_BY_TYPE: Record<StepTypeEnum, string> = {
  email: 'Email Step',
  chat: 'Chat Step',
  in_app: 'In-App Step',
  sms: 'SMS Step',
  push: 'Push Step',
  digest: 'Digest Step',
  delay: 'Delay Step',
  trigger: 'Trigger Step',
  custom: 'Custom Step',
};

const createStep = (type: StepTypeEnum): StepDto => ({
  name: STEP_NAME_BY_TYPE[type],
  type,
  controlValues: {},
  controls: {
    schema: {},
  },
});

export const WorkflowEditorProvider = ({ children }: { children: ReactNode }) => {
  const { currentEnvironment } = useEnvironment();
  const { workflowId } = useParams<{ workflowId?: string }>();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({ mode: 'onSubmit', resolver: zodResolver(formSchema) });
  const { handleSubmit, reset } = form;
  const steps = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  const { workflow: _workflow } = useFetchWorkflow({
    workflowId,
    onSuccess: (data) => {
      reset(data);
    },
    onError: () => {
      navigate(buildRoute(ROUTES.WORKFLOWS, { environmentId: currentEnvironment?._id ?? '' }));
    },
  });

  const addStep = useCallback(
    (channelType: StepTypeEnum, stepIndex?: number) => {
      const newStep = createStep(channelType);
      if (stepIndex != null) {
        steps.insert(stepIndex, newStep);
      } else {
        steps.append(newStep);
      }
    },
    [steps]
  );

  const onSubmit = async (_data: z.infer<typeof formSchema>) => {
    // TODO: Implement submit logic
  };

  const value = useMemo(
    () => ({
      addStep,
    }),
    [addStep]
  );

  return (
    <WorkflowEditorContext.Provider value={value}>
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="h-full">
          {children}
        </form>
      </Form>
    </WorkflowEditorContext.Provider>
  );
};
