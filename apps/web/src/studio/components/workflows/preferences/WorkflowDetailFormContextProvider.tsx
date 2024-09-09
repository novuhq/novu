import { WorkflowChannelPreferences } from '@novu/shared';
import { FC, PropsWithChildren } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { WorkflowGeneralSettings } from './types';
import { DEFAULT_WORKFLOW_PREFERENCES } from './WorkflowSubscriptionPreferences.const';

interface IWorkflowDetailFormContextProviderProps {}

export type WorkflowDetailFormContext = {
  general: WorkflowGeneralSettings;
  preferences: WorkflowChannelPreferences;
};

const DEFAULT_FORM_VALUES: WorkflowDetailFormContext = {
  general: {
    workflowId: '',
    description: '',
    name: '',
  },
  preferences: DEFAULT_WORKFLOW_PREFERENCES,
};

export const WorkflowDetailFormContextProvider: FC<PropsWithChildren<IWorkflowDetailFormContextProviderProps>> = ({
  children,
}) => {
  const formValues = useForm<WorkflowDetailFormContext>({
    mode: 'onChange',
    defaultValues: DEFAULT_FORM_VALUES,
    values: {
      general: {
        workflowId: '',
        name: '',
        description: undefined,
      },
      preferences: DEFAULT_WORKFLOW_PREFERENCES,
    },
  });

  return <FormProvider {...formValues}>{children}</FormProvider>;
};
