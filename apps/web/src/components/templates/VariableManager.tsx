import { TemplateVariableTypeEnum, TemplateSystemVariables } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { Code, Space, Table } from '@mantine/core';
import styled from '@emotion/styled';
import { colors, Input, Switch, Text } from '../../design-system';
import { FieldArrayProvider } from './FieldArrayProvider';
import { When } from '../utils/When';

interface VariableManagerProps {
  index: number;
  variablesArray: Record<string, any>;
  hideLabel?: boolean;
}

interface VariableComponentProps {
  index: number;
  template: string;
}

export interface IMustacheVariable {
  type: TemplateVariableTypeEnum;
  name: string;
  defaultValue?: string | boolean;
  required?: boolean;
}

export const VariableComponent = ({ index, template }: VariableComponentProps) => {
  const { control, watch } = useFormContext();

  const variableName = watch(`${template}.variables.${index}.name`);
  const variableType = watch(`${template}.variables.${index}.type`);

  const variableTypeHumanize = {
    [TemplateVariableTypeEnum.STRING]: 'value',
    [TemplateVariableTypeEnum.ARRAY]: 'array',
    [TemplateVariableTypeEnum.BOOLEAN]: 'boolean',
  }[variableType];

  const isSystemVariable = TemplateSystemVariables.includes(
    variableName.includes('.') ? variableName.split('.')[0] : variableName
  );

  return (
    <VariableWrapper data-test-id="template-variable-row">
      <td>
        <Code
          sx={(theme) => ({
            backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.BGLight,
          })}
        >
          {variableName}
        </Code>
      </td>
      <td>
        <Code
          sx={(theme) => ({
            backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.BGLight,
            color: colors.B60,
          })}
        >
          {variableTypeHumanize}
        </Code>
      </td>
      <td>
        {variableType === 'String' && !isSystemVariable && (
          <Controller
            name={`${template}.variables.${index}.defaultValue`}
            control={control}
            render={({ field, fieldState }) => {
              return (
                <Input
                  error={fieldState.error?.message}
                  type="text"
                  placeholder="Default Value"
                  value={field.value}
                  onChange={field.onChange}
                />
              );
            }}
          />
        )}
        {variableType === 'Boolean' && !isSystemVariable && (
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
        )}
        {isSystemVariable && (
          <Text color={colors.B60} size="lg" weight="bold">
            This variable is reserved by the system
          </Text>
        )}
      </td>
      <td className="required-td">
        <Controller
          name={`${template}.variables.${index}.required`}
          control={control}
          render={({ field }) => {
            return (
              <Switch
                label="is&nbsp;required"
                checked={field.value === true}
                onChange={field.onChange}
                disabled={isSystemVariable}
              />
            );
          }}
        />
      </td>
    </VariableWrapper>
  );
};

export function VariableManager({ variablesArray, index, hideLabel = false }: VariableManagerProps) {
  if (!variablesArray.fields.length) return null;

  return (
    <>
      <When truthy={hideLabel === false}>
        <Text size="md" weight="bold" mt={20}>
          Variables
        </Text>
      </When>

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
            {variablesArray.fields.map((field, ind) => (
              <VariableComponent key={field.id} index={ind} template={`steps.${index}.template`} />
            ))}
          </FieldArrayProvider>
        </tbody>
      </Table>

      <Space h="sm" />
    </>
  );
}

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
