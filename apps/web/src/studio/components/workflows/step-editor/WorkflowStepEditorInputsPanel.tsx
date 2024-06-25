import { FC } from 'react';
import { Button, JsonSchemaForm, Tabs } from '@novu/novui';
import { IconOutlineEditNote, IconOutlineSave, IconOutlineTune } from '@novu/novui/icons';
import { css } from '@novu/novui/css';
import { Container } from '@novu/novui/jsx';

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
            <Container className={formContainerClassName}>
              <JsonSchemaForm
                onChange={(data) => onChange('payload', data)}
                schema={workflow?.options?.payloadSchema || {}}
                formData={{}}
              />
            </Container>
          ),
        },
        {
          icon: <IconOutlineEditNote />,
          value: 'step-inputs',
          label: 'Step inputs',
          content: (
            <Container className={formContainerClassName}>
              {onSave && (
                <div style={{ display: 'flex', justifyContent: 'end' }}>
                  <Button
                    loading={isLoadingSave}
                    variant={'filled'}
                    size={'sm'}
                    Icon={IconOutlineSave}
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
            </Container>
          ),
        },
      ]}
    />
  );
};

export const formContainerClassName = css({
  h: '80vh',
  overflowY: 'auto !important',
  scrollbar: 'hidden',
});
