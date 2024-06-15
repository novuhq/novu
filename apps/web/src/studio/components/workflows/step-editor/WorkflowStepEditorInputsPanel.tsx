import { Input } from '@novu/design-system';
import { Tabs, Title } from '@novu/novui';
import { IconOutlineEditNote, IconOutlineTune } from '@novu/novui/icons';
import { FC } from 'react';

interface IWorkflowStepEditorInputsPanelProps {
  // TODO: Placeholder for real props
  placeholder?: never;
}

export const WorkflowStepEditorInputsPanel: FC<IWorkflowStepEditorInputsPanelProps> = ({}) => {
  return (
    <Tabs
      defaultValue="payload"
      tabConfigs={[
        {
          icon: <IconOutlineTune />,
          value: 'payload',
          label: 'Payload',
          content: (
            <>
              <Title variant="subsection">Payload inputs placeholder</Title>
              <Input />
              <Input />
              <Input />
              <Input />
              <Input />
              <Input />
              <Input />
            </>
          ),
        },
        {
          icon: <IconOutlineEditNote />,
          value: 'step-inputs',
          label: 'Step inputs',
          content: (
            <>
              <Title variant="subsection">Step inputs placeholder</Title>
              <Input />
              <Input />
              <Input />
              <Input />
              <Input />
              <Input />
              <Input />
            </>
          ),
        },
      ]}
    />
  );
};
