import { WorkflowPreferences } from '@novu/shared';
import { FC, PropsWithChildren } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { WorkflowGeneralSettings } from './types';

interface IWorkflowDetailFormContextProviderProps {}

export type WorkflowDetailFormContext = {
  general: WorkflowGeneralSettings;
  preferences: WorkflowPreferences | null;
};

export const WorkflowDetailFormContextProvider: FC<PropsWithChildren<IWorkflowDetailFormContextProviderProps>> = ({
  children,
}) => {
  const formValues = useForm<WorkflowDetailFormContext>({
    mode: 'onChange',
  });

  return <FormProvider {...formValues}>{children}</FormProvider>;
};
