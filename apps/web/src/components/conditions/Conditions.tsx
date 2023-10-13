import { Grid, Group, ActionIcon, Center, useMantineTheme } from '@mantine/core';
import styled from '@emotion/styled';
import { Control, Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';

import { FilterPartTypeEnum, IFieldFilterPart } from '@novu/shared';

import { Button, colors, Dropdown, Input, Select, Sidebar, Text, Title, Tooltip } from '../../design-system';
import { ConditionPlus, DotsHorizontal, Duplicate, Trash, Condition, ErrorIcon } from '../../design-system/icons';
import { When } from '../utils/When';
import { DataSelect, IConditions, IConditionsForm, IConditionsProps, IFilterTypeList } from './types';
import { OnlineConditionRow } from './OnlineConditionRow';
import { DefaultGroupOperatorData, DefaultOperatorData } from './constants';
import { PreviousStepsConditionRow } from './PreviousStepsConditionRow';

export function Conditions({
  isOpened,
  conditions,
  onClose,
  updateConditions,
  name,
  label = '',
  filterPartsList,
  defaultFilter,
}: {
  isOpened: boolean;
  onClose: () => void;
  updateConditions: (data: IConditions[]) => void;
  conditions?: IConditions[];
  name: string;
  label?: string;
  filterPartsList: IFilterTypeList[];
  defaultFilter?: FilterPartTypeEnum;
}) {
  const { colorScheme } = useMantineTheme();

  const {
    control,
    getValues,
    trigger,
    formState: { errors, isValid, isDirty },
  } = useForm<IConditionsForm>({
    defaultValues: { conditions },
    mode: 'onChange',
  });

  const defaultOnFilter = defaultFilter ?? filterPartsList[0].value;

  const { fields, append, remove, insert, update } = useFieldArray({
    control,
    name: `conditions.0.children` as 'conditions.0.children',
  });

  const filterPartTypeList = filterPartsList?.map(({ value, label: filterLabel }) => {
    return {
      value,
      label: filterLabel,
    };
  });

  function handleOnChildOnChange(index: number) {
    return (data) => {
      const { id: _, ...rest } = fields[index];

      if (data === FilterPartTypeEnum.IS_ONLINE) {
        update(index, { ...rest, on: data, value: true });

        return;
      }

      update(index, { ...rest, on: data });
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
    if (!errors.conditions) {
      updateConditions(getValues('conditions'));
      onClose();
    }
  };

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

          const customData = filterPartsList?.find((filter) => filter.value === filterFieldOn)?.data;

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
                                  data={DefaultGroupOperatorData}
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
                        defaultValue={defaultOnFilter}
                        render={({ field }) => {
                          return (
                            <Select
                              placeholder="On"
                              data={filterPartTypeList}
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
                      <EqualityForm webhook control={control} index={index} />
                    </When>
                    <When truthy={filterFieldOn === FilterPartTypeEnum.PREVIOUS_STEP}>
                      <PreviousStepsConditionRow customData={customData} control={control} index={index} />
                    </When>
                    <When
                      truthy={[FilterPartTypeEnum.IS_ONLINE, FilterPartTypeEnum.IS_ONLINE_IN_LAST].includes(
                        filterFieldOn
                      )}
                    >
                      <OnlineConditionRow fieldOn={filterFieldOn} control={control} index={index} />
                    </When>
                    <When
                      truthy={[
                        FilterPartTypeEnum.PAYLOAD,
                        FilterPartTypeEnum.SUBSCRIBER,
                        FilterPartTypeEnum.TENANT,
                      ].includes(filterFieldOn)}
                    >
                      <EqualityForm customData={customData} control={control} index={index} />
                    </When>
                  </Grid>
                </Grid.Col>
                <ConditionRowMenu onDuplicate={() => handleDuplicate(index)} onDelete={() => handleDelete(index)} />
              </Grid>
            </div>
          );
        })}
      </div>

      <Group position="left" mb={8}>
        <Button
          variant="outline"
          onClick={() => {
            append({
              operator: 'EQUAL',
              on: defaultOnFilter,
            } as IFieldFilterPart);
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
  webhook = false,
  customData,
}: {
  control: Control<IConditionsForm>;
  index: number;
  webhook?: boolean;
  customData?: DataSelect[];
}) {
  const operator = useWatch({
    control,
    name: `conditions.0.children.${index}.operator`,
  });

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
                rightSection={<RightSectionError showError={!!fieldState.error} label="Key is missing" />}
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
                data={customData ?? DefaultOperatorData}
                {...field}
                data-test-id="conditions-form-operator"
              />
            );
          }}
        />
      </Grid.Col>

      <Grid.Col span="auto">
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
                  rightSection={<RightSectionError showError={!!fieldState.error} label={'Value is missing'} />}
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

function WebHookUrlForm({ control, index }: IConditionsProps) {
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
                rightSection={<RightSectionError showError={!!fieldState.error} label="Url is missing" />}
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

export function RightSectionError({ showError, label }: { showError: boolean; label: string }) {
  return (
    <When truthy={showError}>
      <Tooltip opened data-test-id="conditions-form-tooltip-error" error position="top" offset={15} label={label}>
        <span>
          <ErrorIcon data-test-id="conditions-form-value-error" color={colors.error} />
        </span>
      </Tooltip>
    </When>
  );
}

function ConditionRowMenu({ onDuplicate, onDelete }: { onDuplicate: () => void; onDelete: () => void }) {
  return (
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
        <Dropdown.Item data-test-id="conditions-row-duplicate" onClick={onDuplicate} icon={<Duplicate />}>
          Duplicate
        </Dropdown.Item>
        <Dropdown.Item data-test-id="conditions-row-delete" onClick={onDelete} icon={<Trash />}>
          Delete
        </Dropdown.Item>
      </Dropdown>
    </Grid.Col>
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
