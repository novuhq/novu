import { Button, JsonSchemaForm, Tabs } from '@novu/novui';
import { IconOutlineEditNote, IconOutlineTune } from '@novu/novui/icons';
import { FC, useMemo } from 'react';
import { useDocsModal } from '../../../../components/docs/useDocsModal';
import { When } from '../../../../components/utils/When';
import { InputsEmptyPanel } from './InputsEmptyPanel';

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
  const { Component, toggle, setPath } = useDocsModal();
  const havePayloadProperties = useMemo(() => {
    return Object.keys(workflow?.options?.payloadSchema?.properties || {}).length > 0;
  }, [workflow?.options?.payloadSchema]);

  const haveInputProperties = useMemo(() => {
    return Object.keys(step?.inputs?.schema?.properties || {}).length > 0;
  }, [step?.inputs?.schema]);

  return (
    <>
      <Tabs
        defaultValue="payload"
        tabConfigs={[
          {
            icon: <IconOutlineTune />,
            value: 'payload',
            label: 'Payload',
            content: (
              <>
                <When truthy={havePayloadProperties}>
                  <JsonSchemaForm
                    onChange={(data) => onChange('payload', data)}
                    schema={workflow?.options?.payloadSchema || {}}
                    formData={{}}
                  />
                </When>
                <When truthy={!havePayloadProperties}>
                  <InputsEmptyPanel
                    content="Payload ensures correct formatting and data validity."
                    onDocsClick={() => {
                      setPath('framework/concepts/payload');
                      toggle();
                    }}
                  />
                </When>
              </>
            ),
          },
          {
            icon: <IconOutlineEditNote />,
            value: 'step-inputs',
            label: 'Step inputs',
            content: (
              <>
                <When truthy={haveInputProperties}>
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
                </When>
                <When truthy={!haveInputProperties}>
                  <InputsEmptyPanel
                    content="Modifiable controls defined by the code schema."
                    onDocsClick={() => {
                      setPath('framework/concepts/inputs');
                      toggle();
                    }}
                  />
                </When>
              </>
            ),
          },
        ]}
      />
      <Component />
    </>
  );
};
