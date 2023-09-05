import { Grid, Group, ActionIcon, Center, useMantineTheme } from '@mantine/core';
import styled from '@emotion/styled';
import { useMemo } from 'react';
import { Control, Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

import { FILTER_TO_LABEL, FilterPartTypeEnum } from '@novu/shared';

import { Button, colors, Dropdown, Input, Select, Sidebar, Text, Title, Tooltip } from '../../design-system';
import { ConditionPlus, DotsHorizontal, Duplicate, Trash, Condition, ErrorIcon } from '../../design-system/icons';
import { When } from '../utils/When';
import { ConditionsContextEnum, ConditionsContextFields, IConditions } from './types';

interface IConditionsForm {
  conditions: IConditions[];
}
export function Conditions({
  isOpened,
  conditions,
  onClose,
  setConditions,
  name,
  context = ConditionsContextEnum.INTEGRATIONS,
}: {
  isOpened: boolean;
  onClose: () => void;
  setConditions: (data: IConditions[]) => void;
  conditions?: IConditions[];
  name: string;
  context?: ConditionsContextEnum;
}) {
  const { colorScheme } = useMantineTheme();

  const {
    control,
    getValues,
    trigger,
    formState: { errors, isValid },
  } = useForm<IConditionsForm>({
    defaultValues: { conditions },
    shouldUseNativeValidation: false,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const { fields, append, update, remove, insert } = useFieldArray({
    control,
    name: `conditions.0.children`,
  });

  const { label, filterPartsList } = ConditionsContextFields[context];

  const FilterPartTypeList = useMemo(() => {
    return filterPartsList.map((filterType) => {
      return {
        value: filterType,
        label: FILTER_TO_LABEL[filterType],
      };
    });
  }, [context]);

  function handleOnChildOnChange(index: number) {
    return (data) => {
      const newField = Object.assign({}, fields[index], { on: data });
      update(index, newField);
    };
  }

  function handleDuplicate(index: number) {
    insert(index + 1, getValues(`conditions.0.children.${index}`));
  }

  function handleDelete(index: number) {
    remove(index);
  }

  const onApplyConditions = async () => {
    await trigger('conditions');
    if (!errors.conditions && fields.length > 0) {
      updateConditions(getValues('conditions'));
    }
  };

  function updateConditions(data) {
    setConditions(data);
    onClose();
  }

  return (
    <Sidebar
      isOpened={isOpened}
      onClose={onClose}
      isExpanded
      customHeader={
        <Center inline>
          <Condition color={colorScheme === 'dark' ? colors.white : colors.B30} />
          <Title ml={8} size={2} data-test-id="conditions-form-title">
            Conditions for {name} {label}
          </Title>
        </Center>
      }
      customFooter={
        <Group ml="auto">
          <Button variant="outline" onClick={onClose} data-test-id="conditions-form-cancel-btn">
            Cancel
          </Button>
          <Tooltip
            position="top"
            error
            disabled={isValid && fields.length > 0}
            label={!isValid ? 'Some conditions are missing values' : 'Add at least one condition'}
          >
            <div>
              <Button onClick={onApplyConditions} data-test-id="apply-conditions-btn">
                Apply conditions
              </Button>
            </div>
          </Tooltip>
        </Group>
      }
    >
      {fields.map((item, index) => {
        return (
          <div key={item.id}>
            <Grid columns={20} align="center" gutter="xs">
              <Grid.Col span={2}>
                {index > 0 ? (
                  <Wrapper>
                    <Controller
                      control={control}
                      name={`conditions.0.value`}
                      defaultValue="AND"
                      render={({ field }) => {
                        return (
                          <Select
                            data={[
                              { value: 'AND', label: 'And' },
                              { value: 'OR', label: 'Or' },
                            ]}
                            {...field}
                            data-test-id="conditions-form-value-dropdown"
                          />
                        );
                      }}
                    />
                  </Wrapper>
                ) : (
                  <Text ml={14} color={colors.B60}>
                    When
                  </Text>
                )}
              </Grid.Col>
              <Grid.Col span={3}>
                <Controller
                  control={control}
                  name={`conditions.0.children.${index}.on`}
                  defaultValue={FilterPartTypeEnum.TENANT}
                  render={({ field }) => {
                    return (
                      <Select
                        placeholder="On"
                        data={FilterPartTypeList}
                        {...field}
                        onChange={handleOnChildOnChange(index)}
                        data-test-id="conditions-form-on-dropdown"
                      />
                    );
                  }}
                />
              </Grid.Col>
              <EqualityForm control={control} index={index} />
              <Grid.Col span={1}>
                <Dropdown
                  withArrow={false}
                  offset={0}
                  control={
                    <ActionIcon variant={'transparent'}>
                      <DotsHorizontal color={colors.B60} />
                    </ActionIcon>
                  }
                  middlewares={{ flip: false, shift: false }}
                  position="bottom-end"
                >
                  <Dropdown.Item onClick={() => handleDuplicate(index)} icon={<Duplicate />}>
                    Duplicate
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => handleDelete(index)} icon={<Trash />}>
                    Delete
                  </Dropdown.Item>
                </Dropdown>
              </Grid.Col>
            </Grid>
          </div>
        );
      })}

      <Group position="left">
        <Button
          variant="outline"
          onClick={() => {
            append({
              operator: 'EQUAL',
              on: FilterPartTypeEnum.TENANT,
              field: 'identifier',
              value: '',
            });
          }}
          icon={<ConditionPlus />}
        >
          Add condition
        </Button>
      </Group>
    </Sidebar>
  );
}

function EqualityForm({ control, index }: { control: Control<IConditionsForm>; index: number }) {
  const operator = useWatch({
    control,
    name: `conditions.0.children.${index}.operator`,
  });

  return (
    <>
      <Grid.Col span={5}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.field`}
          defaultValue="identifier"
          render={({ field }) => {
            return (
              <Select
                placeholder="Key"
                data={[
                  { value: 'name', label: 'Name' },
                  { value: 'identifier', label: 'Identifier' },
                ]}
                {...field}
                data-test-id="conditions-form-field-dropdown"
              />
            );
          }}
        />
      </Grid.Col>
      <Grid.Col span={3}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.operator`}
          defaultValue="EQUAL"
          render={({ field }) => {
            return (
              <Select
                placeholder="Operator"
                data={[
                  { value: 'EQUAL', label: 'Equal' },
                  { value: 'NOT_EQUAL', label: 'Does not equal' },
                  { value: 'IN', label: 'Contains' },
                  { value: 'NOT_IN', label: 'Does not contain' },
                  { value: 'IS_DEFINED', label: 'Is defined' },
                ]}
                {...field}
                data-test-id="conditions-form-operator-dropdown"
              />
            );
          }}
        />
      </Grid.Col>

      <Grid.Col span={6}>
        {operator !== 'IS_DEFINED' && (
          <Controller
            control={control}
            name={`conditions.0.children.${index}.value`}
            defaultValue=""
            rules={{ required: true }}
            render={({ field, fieldState }) => {
              return (
                <Input
                  {...field}
                  value={field.value as string}
                  rightSection={
                    <When truthy={!!fieldState.error}>
                      <Tooltip error position="top" offset={15} label={'Value is missing'}>
                        <span>
                          <ErrorIcon color={colors.error} />
                        </span>
                      </Tooltip>
                    </When>
                  }
                  required
                  error={!!fieldState.error}
                  placeholder="Value"
                  data-test-id="conditions-form-value-input"
                />
              );
            }}
          />
        )}
      </Grid.Col>
    </>
  );
}

const Wrapper = styled.div`
  .mantine-Select-wrapper:not(:hover) {
    .mantine-Select-input {
      border-color: transparent;
      color: ${colors.B60};
    }
    .mantine-Input-rightSection.mantine-Select-rightSection {
      svg {
        display: none;
      }
    }
  }
`;
