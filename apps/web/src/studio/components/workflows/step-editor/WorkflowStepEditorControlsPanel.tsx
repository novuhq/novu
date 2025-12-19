import { Button, JsonSchemaForm, Tabs, Title, useDebouncedCallback } from '@novu/novui';
import { css } from '@novu/novui/css';
import { IconOutlineEditNote, IconOutlineSave, IconOutlineTune } from '@novu/novui/icons';
import { Container, Flex } from '@novu/novui/jsx';
import { FC, useMemo } from 'react';
import { PATHS } from '../../../../components/docs/docs.const';
import { useDocsModal } from '../../../../components/docs/useDocsModal';
import { When } from '../../../../components/utils/When';
import { useTelemetry } from '../../../../hooks/useNovuAPI';
import { getSuggestionVariables, subscriberVariables } from '../../../utils';
import { ControlsEmptyPanel } from './ControlsEmptyPanel';

export type OnChangeType = 'step' | 'payload';

interface IWorkflowStepEditorControlsPanelProps {
  step: any;
  workflow: any;
  onChange: (type: OnChangeType, data: any, id?: string) => void;
  onSave?: () => void;
  defaultControls?: Record<string, unknown>;
  isLoadingSave?: boolean;
  className?: string;
  source?: 'studio' | 'playground' | 'dashboard';
}

const TYPING_DEBOUNCE_TIME_MS = 500;

export const WorkflowStepEditorControlsPanel: FC<IWorkflowStepEditorControlsPanelProps> = ({
  step,
  workflow,
  onChange,
  onSave,
  defaultControls,
  isLoadingSave,
  className,
}) => {
  const track = useTelemetry();
  const { Component, toggle, setPath } = useDocsModal();

  const [payloadProperties, havePayloadProperties] = useMemo(() => {
    const payloadObject = workflow?.payload?.schema?.properties || workflow?.payloadSchema?.properties || {};

    return [getSuggestionVariables(payloadObject, 'payload'), Object.keys(payloadObject).length > 0];
  }, [workflow?.payload?.schema, workflow?.payloadSchema]);

  const [haveControlProperties] = useMemo(() => {
    const controlsObject = step?.controls?.schema?.properties || {};

    return [Object.keys(controlsObject).length > 0];
  }, [step?.controls?.schema]);

  const handleOnChange = useDebouncedCallback(async (type: OnChangeType, data: any, id?: string) => {
    onChange(type, data, id);
  }, TYPING_DEBOUNCE_TIME_MS);

  const variables = useMemo(() => [...(subscriberVariables || []), ...(payloadProperties || [])], [payloadProperties]);

  return (
    <>
      <Tabs
        className={className}
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
                    <Flex justifyContent="space-between" alignItems={'center'} marginBottom="50">
                      <Title variant="subsection">Email step controls</Title>
                      <Button
                        loading={isLoadingSave}
                        variant={'filled'}
                        size={'xs'}
                        Icon={IconOutlineSave}
                        onClick={() => {
                          track('Step controls saved - [Workflows Step Page]', {
                            step: step?.type,
                          });
                          onSave();
                        }}
                      >
                        Save
                      </Button>
                    </Flex>
                  )}

                  <JsonSchemaForm
                    onChange={(data, id) => handleOnChange('step', data, id)}
                    schema={step?.controls?.schema || {}}
                    formData={defaultControls || {}}
                    variables={variables}
                  />
                </When>
                <When truthy={!haveControlProperties}>
                  <ControlsEmptyPanel
                    content="Modifiable controls defined by the code schema."
                    onDocsClick={() => {
                      setPath(PATHS.CONCEPT_CONTROLS);
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
                    onChange={(data, id) => handleOnChange('payload', data, id)}
                    schema={workflow?.payload?.schema || workflow?.payloadSchema || {}}
                    formData={{}}
                  />
                </When>
                <When truthy={!havePayloadProperties}>
                  <ControlsEmptyPanel
                    content="Payload ensures correct formatting and data validity."
                    onDocsClick={() => {
                      setPath(`${PATHS.WORKFLOW_INTRODUCTION}#payload-schema`);
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
  h: '[72vh]',
  overflowY: 'auto',
  scrollbar: 'hidden',
});
