import { buildWorkflowChannelPreferences, WorkflowChannelPreferences } from '@novu/shared';
import { FC, PropsWithChildren } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { WorkflowGeneralSettings } from './types';

interface IWorkflowDetailFormContextProviderProps {}

export type WorkflowDetailFormContext = {
  general: WorkflowGeneralSettings;
  preferences: WorkflowChannelPreferences;
};

const DEFAULT_FORM_VALUES: WorkflowDetailFormContext = {
  general: {
    workflowId: '',
    name: '',
  },
  preferences: buildWorkflowChannelPreferences(undefined),
};

export const WorkflowDetailFormContextProvider: FC<PropsWithChildren<IWorkflowDetailFormContextProviderProps>> = ({
  children,
}) => {
  const formValues = useForm<WorkflowDetailFormContext>({
    mode: 'onChange',
    defaultValues: DEFAULT_FORM_VALUES,
  });

  return <FormProvider {...formValues}>{children}</FormProvider>;
};
