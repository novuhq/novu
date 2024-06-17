import { JsonSchemaForm, Tabs } from '@novu/novui';
import { IconOutlineEditNote, IconOutlineTune } from '@novu/novui/icons';
import { FC } from 'react';

interface IWorkflowStepEditorInputsPanelProps {
  // TODO: Placeholder for real props
  placeholder?: never;
  step: any;
  workflow: any;
  onChange: (type: 'step' | 'payload', data: any) => void;
}

export const WorkflowStepEditorInputsPanel: FC<IWorkflowStepEditorInputsPanelProps> = ({
  step,
  workflow,
  onChange,
}) => {
  return (
    <Tabs
      defaultValue="payload"
      tabConfigs={[
        {
          icon: <IconOutlineTune />,
          value: 'payload',
          label: 'Payload',
          content: (
            <JsonSchemaForm
              onChange={(data) => onChange('payload', data)}
              schema={workflow?.options?.payloadSchema || {}}
              formData={{}}
            />
          ),
        },
        {
          icon: <IconOutlineEditNote />,
          value: 'step-inputs',
          label: 'Step inputs',
          content: (
            <JsonSchemaForm
              onChange={(data) => onChange('step', data)}
              schema={step?.inputs?.schema || {}}
              formData={{}}
            />
          ),
        },
      ]}
    />
  );
};
