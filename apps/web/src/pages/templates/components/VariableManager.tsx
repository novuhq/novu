import { TemplateVariableTypeEnum, TemplateSystemVariables } from '@novu/shared';
import { Controller, useWatch } from 'react-hook-form';
import { Code, Space, Table } from '@mantine/core';
import styled from '@emotion/styled';

import { colors, Input, Switch, Text } from '@novu/design-system';
import { When } from '../../../components/utils/When';
import { useEnvController } from '../../../hooks';

interface VariableManagerProps {
  variablesArray: Record<string, any>;
  hideLabel?: boolean;
  control?: any;
  path?: string;
}

interface VariableComponentProps {
  index: number;
  readonly: boolean;
  control?: any;
  path?: string;
}

export const VariableComponent = ({ index, control, path, readonly }: VariableComponentProps) => {
  const formPrefix = `${path}.variables.${index}`;
  const variableName = useWatch({
    name: `${formPrefix}.name`,
    control,
  });

  const variableType = useWatch({
    name: `${formPrefix}.type`,
    control,
  });

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
        {variableType === TemplateVariableTypeEnum.STRING && !isSystemVariable && (
          <Controller
            name={`${formPrefix}.defaultValue`}
            defaultValue=""
            control={control}
            render={({ field, fieldState }) => {
              return (
                <Input
                  error={fieldState.error?.message}
                  type="text"
                  data-test-id="variable-default-value"
                  placeholder="Default Value"
                  value={field.value}
                  onChange={field.onChange}
                  disabled={readonly}
                />
              );
            }}
          />
        )}
        {variableType === TemplateVariableTypeEnum.BOOLEAN && !isSystemVariable && (
          <Controller
            name={`${formPrefix}.defaultValue`}
            defaultValue=""
            control={control}
            render={({ field }) => {
              return (
                <Switch
                  data-test-id="variable-required-value"
                  label={field.value ? 'True' : 'False'}
                  checked={field.value === true}
                  onChange={field.onChange}
                  disabled={readonly}
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
          name={`${formPrefix}.required`}
          defaultValue={false}
          control={control}
          render={({ field }) => {
            return (
              <Switch
                label="is&nbsp;required"
                checked={field.value === true}
                onChange={field.onChange}
                disabled={isSystemVariable || readonly}
              />
            );
          }}
        />
      </td>
    </VariableWrapper>
  );
};

export function VariableManager({ variablesArray, hideLabel = false, path, control }: VariableManagerProps) {
  const { readonly } = useEnvController();

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
          {variablesArray.fields.map((field, ind) => (
            <VariableComponent key={field.id} index={ind} path={path} control={control} readonly={readonly} />
          ))}
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
