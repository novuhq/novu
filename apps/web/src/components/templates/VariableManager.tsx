import { IEmailBlock } from '@novu/shared';
import { useMemo, useState } from 'react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { parse } from '@handlebars/parser';
import { Code, Space, Table } from '@mantine/core';
import styled from 'styled-components';
import { colors, Input, Switch, Text } from '../../design-system';
import { FieldArrayProvider } from './FieldArrayProvider';

interface VariableManagerProps {
  template: string;
  useTitle?: boolean;
}

interface VariableComponentProps {
  index: number;
  template: string;
}

type MustacheVariableType = 'String' | 'Array' | 'Boolean';

interface IMustacheVariable {
  type: MustacheVariableType;
  name: string;
  defaultValue?: string | boolean;
  required?: boolean;
}

export const VariableComponent = ({ index, template }: VariableComponentProps) => {
  const { control, watch } = useFormContext();

  const variableName = watch(`${template}.variables.${index}.name`);
  const variableType = watch(`${template}.variables.${index}.type`);

  const variableTypeHumanize = {
    String: 'value',
    Array: 'array',
    Object: 'object',
    Boolean: 'boolean',
  }[variableType];

  return (
    <VariableWrapper>
      <td>
        <Code>{variableName}</Code>
      </td>
      <td>
        <Code style={{ color: colors.B60 }}>{variableTypeHumanize}</Code>
      </td>
      <td>
        {variableType === 'String' ? (
          <Controller
            name={`${template}.variables.${index}.defaultValue`}
            control={control}
            render={({ field }) => {
              return <Input type="text" placeholder="Default Value" value={field.value} onChange={field.onChange} />;
            }}
          />
        ) : null}
        {variableType === 'Boolean' ? (
          <Controller
            name={`${template}.variables.${index}.defaultValue`}
            control={control}
            render={({ field }) => {
              return (
                <Switch
                  label={field.value ? 'True' : 'False'}
                  checked={field.value === true}
                  onChange={field.onChange}
                />
              );
            }}
          />
        ) : null}
      </td>
      <td className="required-td">
        <Controller
          name={`${template}.variables.${index}.required`}
          control={control}
          render={({ field }) => {
            return <Switch label="is&nbsp;required" checked={field.value === true} onChange={field.onChange} />;
          }}
        />
      </td>
    </VariableWrapper>
  );
};

export const VariableManager = ({ template, useTitle = false }: VariableManagerProps) => {
  const [ast, setAst] = useState<any>({ body: [] });
  const { watch, control } = useFormContext();
  const variablesArray = useFieldArray({ control, name: `${template}.variables` });

  const content: string | IEmailBlock[] = watch(`${template}.content`);
  const subjectContent: string = useTitle ? watch(`${template}.title`) : '';
  const variableArray = watch(`${template}.variables`, []);

  useMemo(() => {
    const textContent = Array.isArray(content) ? content.map((con) => con.content).join() : content;
    try {
      setAst(parse(textContent + ' ' + subjectContent));
    } catch (e) {}
  }, [content, subjectContent]);

  function getMustacheVariables(bod: any[]): IMustacheVariable[] {
    const stringVariables: IMustacheVariable[] = bod
      .filter((body) => body.type === 'MustacheStatement')
      .map((body) => ({
        type: 'String' as MustacheVariableType,
        name: body.path.original as string,
        defaultValue: '',
        required: false,
      }));

    const arrayVariables: IMustacheVariable[] = bod
      .filter((body) => body.type === 'BlockStatement' && ['each', 'with'].includes(body.path.head))
      .map((body) => ({
        type: 'Array' as MustacheVariableType,
        name: body.params[0].original as string,
        required: false,
      }));

    const boolVariables: IMustacheVariable[] = bod
      .filter((body) => body.type === 'BlockStatement' && ['if'].includes(body.path.head))
      .map((body) => ({
        type: 'Boolean' as MustacheVariableType,
        name: body.params[0].original as string,
        defaultValue: true,
        required: false,
      }));

    return stringVariables.concat(arrayVariables).concat(boolVariables);
  }

  useMemo(() => {
    const variables = getMustacheVariables(ast.body);
    const arrayFields = [...(variableArray || [])];

    variables.forEach((vari) => {
      if (!arrayFields.find((field) => field.name === vari.name)) {
        arrayFields.push(vari);
      }
    });

    arrayFields.forEach((vari, index) => {
      if (!variables.find((field) => field.name === vari.name)) {
        delete arrayFields[index];
      }
    });

    variablesArray.replace(arrayFields.filter((field) => !!field));
  }, [ast]);

  if (!variablesArray.fields.length) return null;

  return (
    <>
      <Text size="md" weight="bold">
        Variables
      </Text>

      <Table>
        <thead>
          <tr>
            <th />
            <th />
            <th />
            <th style={{ textAlign: 'right' }} />
          </tr>
        </thead>
        <tbody>
          <FieldArrayProvider fieldArrays={{ variablesArray }}>
            {variablesArray.fields.map((field, index) => (
              <VariableComponent key={field.id} index={index} template={template} />
            ))}
          </FieldArrayProvider>
        </tbody>
      </Table>

      <Space h="sm" />
    </>
  );
};

const VariableWrapper = styled.tr`
  margin-bottom: 10px;

  .mantine-Code-root {
    padding: 12px;
    font-size: 0.8rem;
    display: inline-block;
  }

  .mantine-TextInput-root input,
  .mantine-Select-wrapper input {
    min-height: 40px;
    margin: 0;
    font-size: 0.8rem;
  }

  .mantine-Switch-root {
    width: auto;
    max-width: inherit;
  }

  .required-td input {
    margin-left: auto;
  }
`;
