import { Grid, Group, ActionIcon, Center, useMantineTheme } from '@mantine/core';
import styled from '@emotion/styled';
import { Control, Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { FilterPartTypeEnum, IFieldFilterPart, FieldLogicalOperatorEnum, FieldOperatorEnum } from '@novu/shared';
import {
  Button,
  colors,
  Dropdown,
  Input,
  Select,
  Sidebar,
  Text,
  Title,
  Tooltip,
  ConditionPlus,
  DotsHorizontal,
  Duplicate,
  Trash,
  Condition,
  ErrorIcon,
  When,
} from '@novu/design-system';

import { DataSelect, IConditions, IConditionsForm, IConditionsProps, IFilterTypeList } from './types';
import { OnlineConditionRow } from './OnlineConditionRow';
import { DefaultGroupOperatorData, DefaultOperatorData } from './constants';
import { PreviousStepsConditionRow } from './PreviousStepsConditionRow';

export interface IConditionsComponentProps {
  isOpened: boolean;
  isReadonly?: boolean;
  onClose: () => void;
  updateConditions: (data: IConditions[]) => void;
  conditions?: IConditions[];
  name: string;
  label?: string;
  filterPartsList: IFilterTypeList[];
  defaultFilter?: FilterPartTypeEnum;
  shouldDisallowEmptyConditions?: boolean;
}

export function Conditions({
  isOpened,
  isReadonly = false,
  conditions,
  onClose,
  updateConditions,
  name,
  label = '',
  filterPartsList,
  defaultFilter,
  shouldDisallowEmptyConditions,
}: IConditionsComponentProps) {
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

  /** Flag for determining if conditions are empty but expected not to be */
  const hasDisallowedEmptyConditions = Boolean(
    shouldDisallowEmptyConditions && getValues().conditions?.some(({ children }) => !children?.[0])
  );

  const isSubmitDisabled =
    !isDirty || isReadonly || (conditions?.length === 0 && fields?.length === 0) || hasDisallowedEmptyConditions;

  const onApplyConditions = async () => {
    await trigger('conditions');
    if (!errors.conditions && !isSubmitDisabled) {
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
          <Tooltip
            position="top"
            error
            disabled={isValid && !hasDisallowedEmptyConditions}
            label={
              hasDisallowedEmptyConditions ? 'At least one condition is required' : 'Some conditions are missing values'
            }
          >
            <div>
              <Button disabled={isSubmitDisabled} onClick={onApplyConditions} data-test-id="apply-conditions-btn">
                Apply conditions
              </Button>
            </div>
          </Tooltip>
        </Group>
      }
      styles={{ body: { '.sidebar-body-holder': { height: '100%' } }, root: { zIndex: 300 } }}
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
                    <Grid.Col span={2} miw={120}>
                      {index > 0 ? (
                        <Wrapper>
                          <Controller
                            control={control}
                            name={`conditions.0.value`}
                            defaultValue={FieldLogicalOperatorEnum.AND}
                            render={({ field }) => {
                              return (
                                <Select
                                  data={DefaultGroupOperatorData}
                                  {...field}
                                  disabled={isReadonly}
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
                              disabled={isReadonly}
                              data-test-id="conditions-form-on"
                            />
                          );
                        }}
                      />
                    </Grid.Col>
                    <When truthy={filterFieldOn === FilterPartTypeEnum.WEBHOOK}>
                      <WebHookUrlForm control={control} index={index} isReadonly={isReadonly} />
                      <EqualityForm webhook control={control} index={index} isReadonly={isReadonly} />
                    </When>
                    <When truthy={filterFieldOn === FilterPartTypeEnum.PREVIOUS_STEP}>
                      <PreviousStepsConditionRow
                        customData={customData}
                        control={control}
                        index={index}
                        isReadonly={isReadonly}
                      />
                    </When>
                    <When
                      truthy={[FilterPartTypeEnum.IS_ONLINE, FilterPartTypeEnum.IS_ONLINE_IN_LAST].includes(
                        filterFieldOn
                      )}
                    >
                      <OnlineConditionRow
                        fieldOn={filterFieldOn}
                        control={control}
                        index={index}
                        isReadonly={isReadonly}
                      />
                    </When>
                    <When
                      truthy={[
                        FilterPartTypeEnum.PAYLOAD,
                        FilterPartTypeEnum.SUBSCRIBER,
                        FilterPartTypeEnum.TENANT,
                      ].includes(filterFieldOn)}
                    >
                      <EqualityForm customData={customData} control={control} index={index} isReadonly={isReadonly} />
                    </When>
                  </Grid>
                </Grid.Col>
                <ConditionRowMenu
                  onDuplicate={() => handleDuplicate(index)}
                  onDelete={() => handleDelete(index)}
                  isReadonly={isReadonly}
                />
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
              operator: FieldOperatorEnum.EQUAL,
              on: defaultOnFilter,
            } as IFieldFilterPart);
          }}
          icon={<ConditionPlus style={{ color: colorScheme === 'dark' ? colors.white : colors.gradientMiddle }} />}
          disabled={isReadonly}
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
  isReadonly = false,
  customData,
}: {
  control: Control<IConditionsForm>;
  index: number;
  webhook?: boolean;
  isReadonly?: boolean;
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
                disabled={isReadonly}
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
          defaultValue={FieldOperatorEnum.EQUAL}
          render={({ field }) => {
            return (
              <Select
                placeholder="Operator"
                data={customData ?? DefaultOperatorData}
                {...field}
                disabled={isReadonly}
                data-test-id="conditions-form-operator"
              />
            );
          }}
        />
      </Grid.Col>

      <Grid.Col span="auto">
        {operator !== FieldOperatorEnum.IS_DEFINED && (
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
                  disabled={isReadonly}
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

function WebHookUrlForm({ control, index, isReadonly = false }: IConditionsProps) {
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
                disabled={isReadonly}
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

function ConditionRowMenu({
  isReadonly,
  onDuplicate,
  onDelete,
}: {
  onDuplicate: () => void;
  onDelete: () => void;
  isReadonly?: boolean;
}) {
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
        disabled={isReadonly}
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
