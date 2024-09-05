import { FC, useMemo } from 'react';

import { Button, JsonSchemaForm, Tabs, Title, useDebouncedCallback } from '@novu/novui';
import { IconOutlineEditNote, IconOutlineTune, IconOutlineSave } from '@novu/novui/icons';
import { css } from '@novu/novui/css';
import { Container, Flex } from '@novu/novui/jsx';

import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useDocsModal } from '../../../../components/docs/useDocsModal';
import { When } from '../../../../components/utils/When';
import { ControlsEmptyPanel } from './ControlsEmptyPanel';
import { useTelemetry } from '../../../../hooks/useNovuAPI';
import { PATHS } from '../../../../components/docs/docs.const';
import { getSuggestionVariables, subscriberVariables } from '../../../utils';
import { useFeatureFlag } from '../../../../hooks/useFeatureFlag';

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
    const payloadObject =
      workflow?.payload?.schema?.properties ||
      workflow?.options?.payloadSchema?.properties ||
      workflow?.payloadSchema?.properties ||
      {};

    return [getSuggestionVariables(payloadObject, 'payload'), Object.keys(payloadObject).length > 0];
  }, [workflow?.payload?.schema, workflow?.options?.payloadSchema, workflow?.payloadSchema]);

  const [haveControlProperties] = useMemo(() => {
    const controlsObject = step?.controls?.schema?.properties || step?.inputs?.schema?.properties || {};

    return [Object.keys(controlsObject).length > 0];
  }, [step?.controls?.schema, step?.inputs?.schema]);

  const handleOnChange = useDebouncedCallback(async (type: OnChangeType, data: any, id?: string) => {
    onChange(type, data, id);
  }, TYPING_DEBOUNCE_TIME_MS);

  const isAutocompleteEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_CONTROLS_AUTOCOMPLETE_ENABLED);

  // set variables to undefined when autocomplete flag is disabled to use plain text entry.
  const variables = useMemo(
    () => (isAutocompleteEnabled ? [...(subscriberVariables || []), ...(payloadProperties || [])] : undefined),
    [payloadProperties, isAutocompleteEnabled]
  );

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
                    schema={step?.controls?.schema || step?.inputs?.schema || {}}
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
