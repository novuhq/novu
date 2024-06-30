import { Button, JsonSchemaForm, Tabs } from '@novu/novui';
import { IconOutlineEditNote, IconOutlineTune, IconOutlineSave } from '@novu/novui/icons';
import { FC, useMemo } from 'react';
import { useDocsModal } from '../../../../components/docs/useDocsModal';
import { When } from '../../../../components/utils/When';
import { ControlsEmptyPanel } from './ControlsEmptyPanel';
import { css } from '@novu/novui/css';
import { Container } from '@novu/novui/jsx';
import { useSegment } from '../../../../components/providers/SegmentProvider';

interface IWorkflowStepEditorControlsPanelProps {
  step: any;
  workflow: any;
  onChange: (type: 'step' | 'payload', data: any, id?: string) => void;
  onSave?: () => void;
  defaultControls?: Record<string, unknown>;
  isLoadingSave?: boolean;
}

export const WorkflowStepEditorControlsPanel: FC<IWorkflowStepEditorControlsPanelProps> = ({
  step,
  workflow,
  onChange,
  onSave,
  defaultControls,
  isLoadingSave,
}) => {
  const segment = useSegment();
  const { Component, toggle, setPath } = useDocsModal();
  const havePayloadProperties = useMemo(() => {
    return (
      Object.keys(workflow?.payload?.schema || workflow?.options?.payloadSchema || workflow?.payloadSchema || {})
        .length > 0
    );
  }, [workflow?.payload?.schema, workflow?.options?.payloadSchema, workflow?.payloadSchema]);

  const haveControlProperties = useMemo(() => {
    return Object.keys(step?.controls?.schema?.properties || step?.inputs?.schema?.properties || {}).length > 0;
  }, [step?.controls?.schema, step?.inputs?.schema]);

  return (
    <>
      <Tabs
        defaultValue="step-controls"
        tabConfigs={[
          {
            icon: <IconOutlineEditNote />,
            value: 'step-controls',
            label: 'Step controls',
            content: (
              <Container className={formContainerClassName}>
                <When truthy={haveControlProperties}>
                  {onSave && (
                    <div style={{ display: 'flex', justifyContent: 'end' }}>
                      <Button
                        loading={isLoadingSave}
                        variant={'filled'}
                        size={'sm'}
                        Icon={IconOutlineSave}
                        onClick={() => {
                          segment.track('Step controls saved - [Workflows Step Page]', {
                            step: step?.type,
                          });
                          onSave();
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  )}

                  <JsonSchemaForm
                    onChange={(data, id) => onChange('step', data, id)}
                    schema={step?.controls?.schema || step?.inputs?.schema || {}}
                    formData={defaultControls || {}}
                  />
                </When>
                <When truthy={!haveControlProperties}>
                  <ControlsEmptyPanel
                    content="Modifiable controls defined by the code schema."
                    onDocsClick={() => {
                      setPath('framework/concepts/controls');
                      toggle();
                    }}
                  />
                </When>
              </Container>
            ),
          },
          {
            icon: <IconOutlineTune />,
            value: 'payload',
            label: 'Payload',
            content: (
              <Container className={formContainerClassName}>
                <When truthy={havePayloadProperties}>
                  <JsonSchemaForm
                    onChange={(data) => onChange('payload', data)}
                    schema={
                      workflow?.payload?.schema || workflow?.options?.payloadSchema || workflow?.payloadSchema || {}
                    }
                    formData={{}}
                  />
                </When>
                <When truthy={!havePayloadProperties}>
                  <ControlsEmptyPanel
                    content="Payload ensures correct formatting and data validity."
                    onDocsClick={() => {
                      setPath('framework/concepts/payload');
                      toggle();
                    }}
                  />
                </When>
              </Container>
            ),
          },
        ]}
      />
      <Component />
    </>
  );
};

export const formContainerClassName = css({
  h: '80vh',
  overflowY: 'auto !important',
  scrollbar: 'hidden',
});
