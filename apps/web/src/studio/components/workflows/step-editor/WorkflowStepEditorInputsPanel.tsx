import { JsonSchemaForm, Tabs } from '@novu/novui';
import { IconOutlineEditNote, IconOutlineTune } from '@novu/novui/icons';
import { FC } from 'react';

interface IWorkflowStepEditorInputsPanelProps {
  // TODO: Placeholder for real props
  placeholder?: never;
  step: any;
  workflow: any;
}

export const WorkflowStepEditorInputsPanel: FC<IWorkflowStepEditorInputsPanelProps> = ({ step, workflow }) => {
  return (
    <Tabs
      defaultValue="payload"
      tabConfigs={[
        {
          icon: <IconOutlineTune />,
          value: 'payload',
          label: 'Payload',
          content: <JsonSchemaForm schema={workflow?.options?.payloadSchema || {}} formData={{}} />,
        },
        {
          icon: <IconOutlineEditNote />,
          value: 'step-inputs',
          label: 'Step inputs',
          content: <JsonSchemaForm schema={step?.inputs?.schema || {}} formData={{}} />,
        },
      ]}
    />
  );
};
