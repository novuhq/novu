import { api } from '../../../api/index';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { ControlVariables } from './ControlVariables';
import { useDebouncedState, useDisclosure } from '@mantine/hooks';
import { Accordion, Code, Group } from '@mantine/core';
import { Button, Text } from '@novu/design-system';

export const ControlVariablesForm = ({ schema, payloadSchema, formData, onChange }) => {
  const [value, setValue] = useDebouncedState<any>({}, 500);
  const [payloadSchemaData, setPayloadSchemaData] = useDebouncedState<any>({}, 500);

  const { isLoading, data: controlVariables } = useQuery(['controls', formData.workflowId, formData._stepId], () =>
    api.get(`/v1/bridge/controls/${formData.workflowId}/${formData.stepId}`)
  );

  const { mutateAsync: saveControls, isLoading: isSavingControls } = useMutation((data) =>
    api.put('/v1/bridge/controls/' + formData?.workflowId + '/' + formData.stepId, { variables: data })
  );

  useEffect(() => {
    onChange({
      inputs: value,
      controls: value,
      payload: payloadSchemaData,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, payloadSchemaData]);

  if (isLoading) {
    return null;
  }

  return (
    <>
      <Accordion multiple defaultValue={['workflow', 'step']}>
        <Accordion.Item value="workflow">
          <Accordion.Control>
            <RenderToolTipHeader title="Workflow Payload" tooltip={<WorkflowSchemaExample />} />
          </Accordion.Control>
          <Accordion.Panel>
            <ControlVariables
              schema={payloadSchema}
              onChange={(data) => {
                setPayloadSchemaData(data);
              }}
              defaults={{}}
            />
          </Accordion.Panel>
        </Accordion.Item>
        <Accordion.Item value="step">
          <Accordion.Control>
            <RenderToolTipHeader title="Step Controls" tooltip={<WorkflowSchemaExample />} />
          </Accordion.Control>
          <Accordion.Panel>
            <ControlVariables
              schema={schema}
              onChange={(data) => {
                setValue(data);
              }}
              defaults={controlVariables?.controls || controlVariables?.inputs || {}}
            />
            <Button
              loading={isSavingControls}
              fullWidth
              onClick={() => {
                saveControls(value);
              }}
              variant="outline"
            >
              Save Controls
            </Button>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </>
  );
};

function RenderToolTipHeader({ tooltip, title }) {
  const [opened, { close, open }] = useDisclosure(false);

  return (
    <Group>
      <Text>{title}</Text>
    </Group>
  );
}

function WorkflowSchemaExample() {
  const controlsCodeSnippet = `payloadSchema: {
  type: "object", 
  properties: {
     showButton: { 
      type: "boolean",
      default: true
    }
  }
}`;

  return (
    <>
      <Text size="xs">Step Controls are used to control the behaviour of a step from the Web UI.</Text>
      <Text size="xs">
        <br /> They can be used for things like: Content, Hiding and showing elements, control the order of elements or
        change parameters like digest length and type. <br /> <br />
      </Text>
      <Text size="xs">Controls are defined using JSON Schema:</Text>
      <Code block>{controlsCodeSnippet}</Code>
    </>
  );
}

function ControlStepExample() {
  const controlsCodeSnippet = `controlSchema: {
  type: "object", 
  properties: {
     showButton: { 
      type: "boolean",
      default: true
    }
  }
}`;

  return (
    <>
      <Text size="xs">Step Controls are used to control the behaviour of a step from the Web UI.</Text>
      <Text size="xs">
        <br /> They can be used for things like: Content, Hiding and showing elements, control the order of elements or
        change parameters like digest length and type. <br /> <br />
      </Text>
      <Text size="xs">Controls are defined using JSON Schema:</Text>
      <Code block>{controlsCodeSnippet}</Code>
    </>
  );
}
