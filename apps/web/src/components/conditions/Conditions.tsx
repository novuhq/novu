import { Grid, Group, ActionIcon, Center, useMantineTheme } from '@mantine/core';
import styled from '@emotion/styled';
import { useMemo } from 'react';
import { Control, Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

import { FILTER_TO_LABEL, FilterPartTypeEnum, PreviousStepTypeEnum, TimeOperatorEnum } from '@novu/shared';

import { Button, colors, Dropdown, Input, Select, Sidebar, Text, Title, Tooltip } from '../../design-system';
import { ConditionPlus, DotsHorizontal, Duplicate, Trash, Condition, ErrorIcon } from '../../design-system/icons';
import { When } from '../utils/When';
import { ConditionsContextEnum, ConditionsContextFields, IConditions } from './types';
import { channels } from '../../utils/channels';
import { IFormStep } from '../../pages/templates/components/formTypes';

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
  selectableSteps,
}: {
  isOpened: boolean;
  onClose: () => void;
  setConditions: (data: IConditions[]) => void;
  conditions?: IConditions[];
  name: string;
  context?: ConditionsContextEnum;
  selectableSteps?: any[];
}) {
  const { colorScheme } = useMantineTheme();

  const {
    control,
    getValues,
    trigger,
    setValue,
    formState: { errors, isValid, isDirty },
  } = useForm<IConditionsForm>({
    defaultValues: { conditions },
    mode: 'onChange',
  });

  const { fields, append, remove, insert, update } = useFieldArray({
    control,
    name: `conditions.0.children` as 'conditions.0.children',
  });

  const { label, filterPartsList, defaultFilter } = ConditionsContextFields[context];

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
      console.log(fields[index], newField);

      update(index, newField);

      if (data === 'isOnline') {
        setValue(`conditions.0.children.${index}.value`, true);
      }
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
    console.log(errors.conditions);
    console.log(fields);
    if (!errors.conditions) {
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
          <Tooltip position="top" error disabled={isValid} label={'Some conditions are missing values'}>
            <div>
              <Button
                disabled={!isDirty || (conditions?.length === 0 && fields?.length === 0)}
                onClick={onApplyConditions}
                data-test-id="apply-conditions-btn"
              >
                Apply conditions
              </Button>
            </div>
          </Tooltip>
        </Group>
      }
    >
      <div>
        {fields.map((item, index) => {
          const filterFieldOn = item.on;
          // const filterFieldOn = (fields[index] as any).on;

          return (
            <div data-test-id="conditions-form-item" key={item.id}>
              <Grid align={'center'}>
                <Grid.Col span={'auto'}>
                  <Grid columns={21} align="center" gutter={8}>
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
                        defaultValue={defaultFilter}
                        render={({ field }) => {
                          return (
                            <Select
                              placeholder="On"
                              data={FilterPartTypeList}
                              {...field}
                              onChange={handleOnChildOnChange(index)}
                              data-test-id="conditions-form-on"
                            />
                          );
                        }}
                      />
                    </Grid.Col>
                    <When truthy={filterFieldOn === FilterPartTypeEnum.WEBHOOK}>
                      <WebHookUrlForm control={control} index={index} />
                      <EqualityForm filterFieldOn={filterFieldOn} control={control} index={index} />
                    </When>
                    <When truthy={filterFieldOn === FilterPartTypeEnum.PREVIOUS_STEP}>
                      <PreviousStepFiltersForm control={control} index={index} selectableSteps={selectableSteps} />
                    </When>
                    <When
                      truthy={[FilterPartTypeEnum.IS_ONLINE, FilterPartTypeEnum.IS_ONLINE_IN_LAST].includes(
                        filterFieldOn
                      )}
                    >
                      <OnlineFiltersForms fieldOn={filterFieldOn} control={control} index={index} />
                    </When>
                    <When
                      truthy={[
                        FilterPartTypeEnum.PAYLOAD,
                        FilterPartTypeEnum.SUBSCRIBER,
                        FilterPartTypeEnum.TENANT,
                      ].includes(filterFieldOn)}
                    >
                      <EqualityForm control={control} index={index} />
                    </When>
                  </Grid>
                </Grid.Col>
                <Grid.Col span={'content'}>
                  <Dropdown
                    withArrow={false}
                    offset={0}
                    control={
                      <ActionIcon data-test-id="conditions-row-btn" variant={'transparent'}>
                        <DotsHorizontal color={colors.B60} />
                      </ActionIcon>
                    }
                    middlewares={{ flip: false, shift: false }}
                    position="bottom-end"
                  >
                    <Dropdown.Item
                      data-test-id="conditions-row-duplicate"
                      onClick={() => handleDuplicate(index)}
                      icon={<Duplicate />}
                    >
                      Duplicate
                    </Dropdown.Item>
                    <Dropdown.Item
                      data-test-id="conditions-row-delete"
                      onClick={() => handleDelete(index)}
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
      </div>

      <Group position="left">
        <Button
          variant="outline"
          onClick={() => {
            append({
              operator: 'EQUAL',
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore
              on: defaultFilter,
              // value: '',
            });
          }}
          icon={<ConditionPlus />}
          data-test-id="add-new-condition"
        >
          Add condition
        </Button>
      </Group>
    </Sidebar>
  );
}

function EqualityForm({
  control,
  index,
  filterFieldOn,
}: {
  control: Control<IConditionsForm>;
  index: number;
  filterFieldOn?: string;
}) {
  const operator = useWatch({
    control,
    name: `conditions.0.children.${index}.operator`,
  });
  const webhook = filterFieldOn === FilterPartTypeEnum.WEBHOOK;

  return (
    <>
      <Grid.Col span={webhook ? 3 : 4}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.field`}
          rules={{ required: true }}
          defaultValue=""
          render={({ field, fieldState }) => {
            return (
              <Input
                placeholder="Key"
                {...field}
                rightSection={
                  <When truthy={!!fieldState.error}>
                    <Tooltip
                      opened
                      data-test-id="conditions-form-tooltip-error"
                      error
                      position="top"
                      offset={15}
                      label={'Key is missing'}
                    >
                      <span>
                        <ErrorIcon data-test-id="conditions-form-value-error" color={colors.error} />
                      </span>
                    </Tooltip>
                  </When>
                }
                error={!!fieldState.error}
                data-test-id="conditions-form-key"
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
                  { value: 'NOT_EQUAL', label: 'Not equal' },
                  { value: 'IN', label: 'Contains' },
                  { value: 'NOT_IN', label: 'Does not contain' },
                  { value: 'IS_DEFINED', label: 'Is defined' },
                  { value: 'LARGER', label: 'Greater than' },
                  { value: 'SMALLER', label: 'Less than' },
                  { value: 'LARGER_EQUAL', label: 'Greater or Equal' },
                  { value: 'SMALLER_EQUAL', label: 'Less or Equal' },
                ]}
                {...field}
                data-test-id="conditions-form-operator"
              />
            );
          }}
        />
      </Grid.Col>

      <Grid.Col span="auto">
        {/*<Grid.Col span={6}>*/}
        {operator !== 'IS_DEFINED' && (
          <Controller
            control={control}
            name={`conditions.0.children.${index}.value`}
            defaultValue=""
            rules={{ required: true }}
            render={({ field, fieldState }) => {
              console.log('field.value', field.value);
              console.log('error', !!fieldState.error);

              return (
                <Input
                  {...field}
                  value={field.value as string}
                  rightSection={
                    <When truthy={!!fieldState.error}>
                      <Tooltip
                        opened
                        data-test-id="conditions-form-tooltip-error"
                        error
                        position="top"
                        offset={15}
                        label={'Value is missing'}
                      >
                        <span>
                          <ErrorIcon data-test-id="conditions-form-value-error" color={colors.error} />
                        </span>
                      </Tooltip>
                    </When>
                  }
                  error={!!fieldState.error}
                  placeholder="Value"
                  data-test-id="conditions-form-value"
                />
              );
            }}
          />
        )}
      </Grid.Col>
    </>
  );
}

function WebHookUrlForm({ control, index }: { control: Control<IConditionsForm>; index: number }) {
  return (
    <>
      <Grid.Col span={4}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.webhookUrl`}
          defaultValue=""
          rules={{ required: true }}
          render={({ field, fieldState }) => {
            return (
              <Input
                {...field}
                rightSection={
                  <When truthy={!!fieldState.error}>
                    <Tooltip
                      opened
                      data-test-id="conditions-form-tooltip-error"
                      error
                      position="top"
                      offset={15}
                      label={'Url is missing'}
                    >
                      <span>
                        <ErrorIcon data-test-id="conditions-form-value-error" color={colors.error} />
                      </span>
                    </Tooltip>
                  </When>
                }
                error={!!fieldState.error}
                placeholder="Url"
                data-test-id="webhook-filter-url-input"
              />
            );
          }}
        />
      </Grid.Col>
    </>
  );
}

function OnlineFiltersForms({ fieldOn, control, index }: { fieldOn: string; control; index: number }) {
  return (
    <>
      {fieldOn === FilterPartTypeEnum.IS_ONLINE ? (
        <OnlineRightNowForm control={control} index={index} />
      ) : (
        <OnlineInTheLastForm control={control} index={index} />
      )}
    </>
  );
}

function PreviousStepFiltersForm({
  control,
  index,
  selectableSteps,
}: {
  control;
  index: number;
  selectableSteps: any;
}) {
  return (
    <>
      <Grid.Col span={4}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.step`}
          defaultValue=""
          render={({ field }) => {
            return (
              <Select
                placeholder="Select previous step"
                data={
                  selectableSteps
                    ?.map((selectable: any, itemIndex: number, list: any[]) => {
                      const labelSelectable = channels.find(
                        (channel) => channel.channelType === selectable.template.type
                      )?.label;

                      return {
                        label: selectable.name ? selectable.name : labelSelectable,
                        value: selectable.uuid,
                      };
                    })
                    .filter((temp) => temp !== undefined) as any[]
                }
                {...field}
                data-test-id="previous-step-dropdown"
              />
            );
          }}
        />
      </Grid.Col>
      <Grid.Col span={3}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.stepType`}
          defaultValue={PreviousStepTypeEnum.READ}
          render={({ field }) => {
            return (
              <Select
                placeholder="Select type"
                data={[
                  {
                    label: 'Read',
                    value: PreviousStepTypeEnum.READ,
                  },
                  {
                    label: 'Unread',
                    value: PreviousStepTypeEnum.UNREAD,
                  },
                  {
                    label: 'Seen',
                    value: PreviousStepTypeEnum.SEEN,
                  },
                  {
                    label: 'Unseen',
                    value: PreviousStepTypeEnum.UNSEEN,
                  },
                ]}
                {...field}
                data-test-id="previous-step-type-dropdown"
              />
            );
          }}
        />
      </Grid.Col>
    </>
  );
}

function OnlineRightNowForm({ control, index }: { control: Control<IConditionsForm>; index: number }) {
  return (
    <>
      <Grid.Col span={4}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.value`}
          defaultValue={'true'}
          rules={{ required: false }}
          render={({ field }) => {
            // const value = typeof field.value !== 'undefined' ? `${field.value}` : 'true';
            const value = typeof field.value === 'boolean' ? `${field.value}` : `${field.value === 'true'}`;
            console.log(field.value, typeof field.value === 'boolean', value);

            return (
              <Select
                placeholder="value"
                data={[
                  { value: 'true', label: 'Yes' },
                  { value: 'false', label: 'No' },
                ]}
                {...field}
                onChange={(val) => {
                  console.log('val', val, val === 'true');
                  field.onChange(val === 'true');
                }}
                value={value}
                data-test-id="online-now-value-dropdown"
              />
            );
          }}
        />
      </Grid.Col>
    </>
  );
}

function OnlineInTheLastForm({ control, index }: { control: Control<IConditionsForm>; index: number }) {
  return (
    <>
      <Grid.Col span={4}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.value`}
          defaultValue=""
          render={({ field, fieldState }) => {
            return (
              <Input
                {...field}
                value={field.value as string}
                rightSection={
                  <When truthy={!!fieldState.error}>
                    <Tooltip
                      opened
                      data-test-id="conditions-form-tooltip-error"
                      error
                      position="top"
                      offset={15}
                      label={'Value is missing'}
                    >
                      <span>
                        <ErrorIcon data-test-id="conditions-form-value-error" color={colors.error} />
                      </span>
                    </Tooltip>
                  </When>
                }
                error={!!fieldState.error}
                placeholder="Value"
                type="number"
                data-test-id="online-in-last-value-input"
              />
            );
          }}
        />
      </Grid.Col>
      <Grid.Col span={3}>
        <Controller
          control={control}
          name={`conditions.0.children.${index}.timeOperator`}
          defaultValue={TimeOperatorEnum.MINUTES}
          render={({ field }) => {
            return (
              <Select
                data={[
                  { value: TimeOperatorEnum.MINUTES, label: 'Minutes' },
                  { value: TimeOperatorEnum.HOURS, label: 'Hours' },
                  { value: TimeOperatorEnum.DAYS, label: 'Days' },
                ]}
                {...field}
                data-test-id="online-in-last-operator-dropdown"
              />
            );
          }}
        />
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
