import { Grid, Group, ActionIcon, Center } from '@mantine/core';
import styled from '@emotion/styled';
import { Controller, useFieldArray, useForm } from 'react-hook-form';

import { FILTER_TO_LABEL, FilterPartTypeEnum } from '@novu/shared';

import { Button, colors, Dropdown, Input, Select, Sidebar, Text, Title, Tooltip } from '../../design-system';
import { ConditionPlus, DotsHorizontal, Duplicate, Trash, Condition, ErrorIcon } from '../../design-system/icons';
import { When } from '../utils/When';
import { IConditions } from '../../pages/integrations/types';

export function Conditions({
  isOpened,
  conditions,
  onClose,
  setConditions,
  name,
}: {
  isOpened: boolean;
  onClose: () => void;
  setConditions: (data: IConditions[]) => void;
  conditions?: IConditions[];
  name: string;
}) {
  const {
    control,
    setValue,
    getValues,
    trigger,
    formState: { errors, isValid },
  } = useForm({
    defaultValues: { conditions },
    shouldUseNativeValidation: false,
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const { fields, append, update, remove, insert } = useFieldArray({
    control,
    name: `conditions.0.children`,
  });

  const FilterPartTypeList = [{ value: FilterPartTypeEnum.TENANT, label: FILTER_TO_LABEL[FilterPartTypeEnum.TENANT] }];

  function handleOnChildOnChange(index: number) {
    return (data) => {
      const newField = Object.assign({}, fields[index], { on: data });
      update(index, newField);
    };
  }

  function updateConditions(data) {
    setConditions(data.conditions);
    onClose();
  }

  return (
    <Sidebar
      isOpened={isOpened}
      onClose={onClose}
      isExpanded
      customHeader={
        <Center inline>
          <Condition />
          <Title ml={8} size={2}>
            Condition for {name} provider instance
          </Title>
        </Center>
      }
      customFooter={
        <Group ml="auto">
          <Button variant="outline" onClick={onClose} data-test-id="create-provider-instance-sidebar-cancel">
            Cancel
          </Button>
          <TooltipContainer>
            <Tooltip
              position={'top'}
              disabled={isValid && fields.length > 0}
              label={!isValid ? 'Some conditions are missing values' : 'Add at least one condition'}
            >
              <div>
                <Button
                  onClick={async () => {
                    await trigger('conditions');
                    if (!errors.conditions && fields.length > 0) {
                      updateConditions(getValues());
                    }
                  }}
                  data-test-id="create-provider-instance-sidebar-create"
                >
                  Apply conditions
                </Button>
              </div>
            </Tooltip>
          </TooltipContainer>
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
                            placeholder="How to group rules?"
                            data={[
                              { value: 'AND', label: 'And' },
                              { value: 'OR', label: 'Or' },
                            ]}
                            {...field}
                            data-test-id="group-rules-dropdown"
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
                        data-test-id="filter-on-dropdown"
                      />
                    );
                  }}
                />
              </Grid.Col>
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
                        data-test-id="group-rules-dropdown"
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
                          { value: 'IS_DEFINED', label: 'Is not empty' },
                        ]}
                        {...field}
                        data-test-id="filter-operator-dropdown"
                        onChange={(value) => {
                          field.onChange(value);
                          if (value === 'IS_DEFINED') {
                            setValue(`conditions.0.children.${index}.value`, '');
                          }
                        }}
                      />
                    );
                  }}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                {getValues(`conditions.0.children.${index}.operator`) !== 'IS_DEFINED' && (
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
                              <TooltipContainer>
                                <Tooltip position="top" offset={15} label={'Value is missing'}>
                                  <span>
                                    <ErrorIcon color={colors.error} />
                                  </span>
                                </Tooltip>
                              </TooltipContainer>
                            </When>
                          }
                          required
                          disabled={getValues(`conditions.0.children.${index}.operator`) === 'IS_DEFINED'}
                          error={!!fieldState.error}
                          placeholder="Value"
                          data-test-id="filter-value-input"
                        />
                      );
                    }}
                  />
                )}
              </Grid.Col>
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
                  <Dropdown.Item
                    onClick={() => {
                      insert(index + 1, getValues(`conditions.0.children.${index}`));
                    }}
                    icon={<Duplicate />}
                  >
                    Duplicate
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      remove(index);
                    }}
                    icon={<Trash />}
                  >
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

const TooltipContainer = styled.div`
  & .mantine-Tooltip-tooltip {
    color: ${colors.error};
    padding: 16px;
    font-size: 14px;
    font-weight: 400;
    border-radius: 8px;
    background: ${({ theme }) =>
      `linear-gradient(0deg, rgba(229, 69, 69, 0.2) 0%, rgba(229, 69, 69, 0.2) 100%),  ${
        theme.colorScheme === 'dark' ? '#23232b' : colors.white
      } !important`};
  }

  & .mantine-Tooltip-arrow {
    background: ${({ theme }) =>
      `linear-gradient(0deg, rgba(229, 69, 69, 0.2) 0%, rgba(229, 69, 69, 0.2) 100%),  ${
        theme.colorScheme === 'dark' ? '#23232b' : colors.white
      } !important`};
  }
`;
