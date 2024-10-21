import { ReactNode, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
// eslint-disable-next-line
// @ts-ignore
import { zodResolver } from '@hookform/resolvers/zod';
import { RiProgress1Line } from 'react-icons/ri';
import * as z from 'zod';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchWorkflow, useFormAutoSave, useUpdateWorkflow } from '@/hooks';
import { StepTypeEnum } from '@/utils/enums';
import { buildRoute, ROUTES } from '@/utils/routes';
import { Step } from '@/utils/types';
import { Form } from '../primitives/form/form';
import { smallToast } from '../primitives/sonner-helpers';
import { formSchema } from './schema';
import { WorkflowEditorContext } from './workflow-editor-context';

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

const createStep = (type: StepTypeEnum): Step => ({
  name: STEP_NAME_BY_TYPE[type],
  type,
});

export const WorkflowEditorProvider = ({ children }: { children: ReactNode }) => {
  const changesSavedToastIdRef = useRef<string | number>();
  const { currentEnvironment } = useEnvironment();
  const { workflowId } = useParams<{ workflowId?: string }>();
  const navigate = useNavigate();
  const form = useForm<z.infer<typeof formSchema>>({ mode: 'onSubmit', resolver: zodResolver(formSchema) });
  const { reset } = form;
  const steps = useFieldArray({
    control: form.control,
    name: 'steps',
  });

  const { workflow, error } = useFetchWorkflow({
    workflowId,
  });

  useLayoutEffect(() => {
    if (error) {
      navigate(buildRoute(ROUTES.WORKFLOWS, { environmentId: currentEnvironment?._id ?? '' }));
    }

    if (!workflow) {
      return;
    }

    reset({ ...workflow, steps: workflow.steps.map((step) => ({ ...step })) });
  }, [workflow, error, navigate, reset, currentEnvironment]);

  const { updateWorkflow } = useUpdateWorkflow({
    onSuccess: (data) => {
      reset({ ...data, steps: data.steps.map((step) => ({ ...step })) });
      if (changesSavedToastIdRef.current) {
        return;
      }

      const id = smallToast({
        children: (
          <>
            <RiProgress1Line className="size-6" />
            <span className="text-sm">Saved</span>
          </>
        ),
        options: {
          position: 'bottom-left',
          classNames: {
            toast: 'ml-10',
          },
          onAutoClose: () => {
            changesSavedToastIdRef.current = undefined;
          },
        },
      });
      changesSavedToastIdRef.current = id;
    },
  });

  useFormAutoSave({
    form,
    onSubmit: async (data: z.infer<typeof formSchema>) => {
      if (!workflow) {
        return;
      }

      updateWorkflow({ id: workflow._id, workflow: { ...workflow, ...data } as any });
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

  const value = useMemo(
    () => ({
      addStep,
    }),
    [addStep]
  );

  return (
    <WorkflowEditorContext.Provider value={value}>
      <Form {...form}>
        <form className="h-full">{children}</form>
      </Form>
    </WorkflowEditorContext.Provider>
  );
};
