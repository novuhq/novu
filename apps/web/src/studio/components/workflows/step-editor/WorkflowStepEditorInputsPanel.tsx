import { Button, JsonSchemaForm, Tabs } from '@novu/novui';
import { IconOutlineEditNote, IconOutlineTune } from '@novu/novui/icons';
import { FC } from 'react';

interface IWorkflowStepEditorInputsPanelProps {
  step: any;
  workflow: any;
  onChange: (type: 'step' | 'payload', data: any) => void;
  onSave?: () => void;
  defaultInputs?: Record<string, unknown>;
  isLoadingSave?: boolean;
}

export const WorkflowStepEditorInputsPanel: FC<IWorkflowStepEditorInputsPanelProps> = ({
  step,
  workflow,
  onChange,
  onSave,
  defaultInputs,
  isLoadingSave,
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
            <>
              {onSave && (
                <div style={{ display: 'flex', justifyContent: 'end' }}>
                  <Button
                    loading={isLoadingSave}
                    variant={'filled'}
                    size={'xs'}
                    onClick={() => {
                      onSave();
                    }}
                  >
                    Save
                  </Button>
                </div>
              )}

              <JsonSchemaForm
                onChange={(data) => onChange('step', data)}
                schema={step?.inputs?.schema || {}}
                formData={defaultInputs || {}}
              />
            </>
          ),
        },
      ]}
    />
  );
};
