import { api } from '../../../api';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { InputVariables } from './InputVariables';
import { useDebouncedState, useDisclosure } from '@mantine/hooks';
import { Accordion, Code, Group } from '@mantine/core';
import { Button, Text } from '@novu/design-system';

export const InputVariablesForm = ({ schema, payloadSchema, formData, onChange }) => {
  const [value, setValue] = useDebouncedState<any>({}, 500);
  const [payloadSchemaData, setPayloadSchemaData] = useDebouncedState<any>({}, 500);

  const { isLoading, data: inputVariables } = useQuery(['inputs', formData.workflowId, formData._stepId], () =>
    api.get(`/v1/echo/inputs/${formData.workflowId}/${formData.stepId}`)
  );

  const { mutateAsync: saveInputs, isLoading: isSavingInputs } = useMutation((data) =>
    api.put('/v1/echo/inputs/' + formData?.workflowId + '/' + formData.stepId, { variables: data })
  );

  useEffect(() => {
    onChange({
      inputs: value,
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
            <InputVariables
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
            <RenderToolTipHeader title="Step Inputs" tooltip={<WorkflowSchemaExample />} />
          </Accordion.Control>
          <Accordion.Panel>
            <InputVariables
              schema={schema}
              onChange={(data) => {
                setValue(data);
              }}
              defaults={inputVariables?.inputs || {}}
            />
            <Button
              loading={isSavingInputs}
              fullWidth
              onClick={() => {
                saveInputs(value);
              }}
              variant="outline"
            >
              Save Inputs
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
  const inputsCodeSnippet = `payloadSchema: {
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
      <Text size="xs">Step Inputs are used to control the behaviour of a step from the Web UI.</Text>
      <Text size="xs">
        <br /> They can be used for things like: Content, Hiding and showing elements, control the order of elements or
        change parameters like digest length and type. <br /> <br />
      </Text>
      <Text size="xs">Inputs are defined using JSON Schema:</Text>
      <Code block>{inputsCodeSnippet}</Code>
    </>
  );
}

function InputStepExample() {
  const inputsCodeSnippet = `inputs: {
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
      <Text size="xs">Step Inputs are used to control the behaviour of a step from the Web UI.</Text>
      <Text size="xs">
        <br /> They can be used for things like: Content, Hiding and showing elements, control the order of elements or
        change parameters like digest length and type. <br /> <br />
      </Text>
      <Text size="xs">Inputs are defined using JSON Schema:</Text>
      <Code block>{inputsCodeSnippet}</Code>
    </>
  );
}
