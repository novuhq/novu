import { Button, colors, Dropdown, Input, Select, Sidebar, Text, Title, Tooltip } from '../../design-system';
import { Grid, Group, ActionIcon, Center } from '@mantine/core';
import { FILTER_TO_LABEL, FilterPartTypeEnum } from '@novu/shared';
import { ConditionPlus, DotsHorizontal, Duplicate, Trash, Condition, ErrorIcon } from '../../design-system/icons';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import styled from '@emotion/styled';
import { useEffect } from 'react';

export function Conditions({
  isOpened,
  conditions,
  onClose,
  setConditions,
}: {
  isOpened: boolean;
  onClose: () => void;
  setConditions: (data: any) => void;
  conditions: any;
}) {
  const {
    control,
    setValue,
    getValues,
    handleSubmit: handleSubmit1,
    watch,
  } = useForm({
    defaultValues: { conditions },
  });
  const { fields, append, update, remove, insert } = useFieldArray({
    control,
    name: `conditions.0.children`,
  });

  const watchConditions = watch(`conditions.0.children`);

  const FilterPartTypeList = [
    { value: FilterPartTypeEnum.TENANT, label: FILTER_TO_LABEL[FilterPartTypeEnum.TENANT] },
    { value: FilterPartTypeEnum.SUBSCRIBER, label: FILTER_TO_LABEL[FilterPartTypeEnum.SUBSCRIBER] },
  ];
  function handleOnChildOnChange(index: number) {
    return (data) => {
      const newField = Object.assign({}, fields[index], { on: data });
      update(index, newField);
    };
  }

  useEffect(() => {
    console.log(watchConditions);
  }, [watchConditions]);
  // console.log('conditions', conditions);

  function updateConditions(data) {
    console.log('data 1', data);
    setConditions(data);
  }

  return (
    <Sidebar
      isOpened={isOpened}
      onClose={onClose}
      isExpanded
      // onSubmit={handleSubmit(updateConditions)}

      onSubmit={(e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log(e);
        handleSubmit1(updateConditions)(e);
        onClose();

        // e.stopPropagation();
      }}
      customHeader={
        <Center inline>
          <Condition />
          <Title ml={8} size={2}>
            Condition for
          </Title>
        </Center>
      }
      customFooter={
        <Group ml="auto">
          <Button variant="outline" onClick={onClose} data-test-id="create-provider-instance-sidebar-cancel">
            Cancel
          </Button>
          <Button submit data-test-id="create-provider-instance-sidebar-create">
            Apply conditions
          </Button>
        </Group>
      }
    >
      {fields.map((item, index) => {
        const filterFieldOn = (fields[index] as any).on;
        console.log('item', item);

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
                  defaultValue=""
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
                  defaultValue=""
                  render={({ field, fieldState }) => {
                    return (
                      <Input
                        {...field}
                        error={fieldState.error?.message}
                        placeholder="Key"
                        data-test-id="filter-key-input"
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
                <Controller
                  control={control}
                  name={`conditions.0.children.${index}.value`}
                  defaultValue=""
                  rules={{ required: 'required' }}
                  render={({ field, fieldState }) => {
                    return (
                      <Input
                        {...field}
                        rightSection={
                          <Tooltip position="top" offset={15} label={'Value is missing'}>
                            <div>
                              <ErrorIcon color={colors.error} />
                            </div>
                          </Tooltip>
                        }
                        required
                        disabled={field.value === 'IS_DEFINED'}
                        error={fieldState.error?.message}
                        placeholder="Value"
                        data-test-id="filter-value-input"
                      />
                    );
                  }}
                />
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
              on: 'tenant',
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
export function Conditions1({
  isOpened,
  conditions,
  onClose,
  setConditions,
}: {
  isOpened: boolean;
  onClose: () => void;
  setConditions: (data: any) => void;
  conditions: any;
}) {
  const {
    control,
    setValue,
    getValues,
    handleSubmit: handleSubmit1,
    watch,
  } = useForm({
    defaultValues: { conditions },
  });
  const { fields, append, update, remove, insert } = useFieldArray({
    control,
    name: `conditions.0.children`,
  });

  const watchConditions = watch(`conditions.0.children`);

  const FilterPartTypeList = [
    { value: FilterPartTypeEnum.TENANT, label: FILTER_TO_LABEL[FilterPartTypeEnum.TENANT] },
    { value: FilterPartTypeEnum.SUBSCRIBER, label: FILTER_TO_LABEL[FilterPartTypeEnum.SUBSCRIBER] },
  ];
  function handleOnChildOnChange(index: number) {
    return (data) => {
      const newField = Object.assign({}, fields[index], { on: data });
      update(index, newField);
    };
  }

  useEffect(() => {
    console.log(watchConditions);
  }, [watchConditions]);
  // console.log('conditions', conditions);

  function updateConditions(data) {
    console.log('data 1', data);
    setConditions(data);
  }

  return (
    <Sidebar
      isOpened={isOpened}
      onClose={onClose}
      isExpanded
      // onSubmit={handleSubmit(updateConditions)}

      onSubmit={(e) => {
        e.preventDefault();
        console.log(e);
        handleSubmit1(updateConditions)(e);
        onClose();

        // e.stopPropagation();
      }}
      customHeader={
        <Center inline>
          <Condition />
          <Title ml={8} size={2}>
            Condition for
          </Title>
        </Center>
      }
      customFooter={
        <Group ml="auto">
          <Button variant="outline" onClick={onClose} data-test-id="create-provider-instance-sidebar-cancel">
            Cancel
          </Button>
          <Button submit data-test-id="create-provider-instance-sidebar-create">
            Apply conditions
          </Button>
        </Group>
      }
    >
      {fields.map((item, index) => {
        const filterFieldOn = (fields[index] as any).on;
        console.log('item', item);

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
                  defaultValue=""
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
                  defaultValue=""
                  render={({ field, fieldState }) => {
                    return (
                      <Input
                        {...field}
                        error={fieldState.error?.message}
                        placeholder="Key"
                        data-test-id="filter-key-input"
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
                <Controller
                  control={control}
                  name={`conditions.0.children.${index}.value`}
                  defaultValue=""
                  rules={{ required: 'required' }}
                  render={({ field, fieldState }) => {
                    return (
                      <Input
                        {...field}
                        rightSection={
                          <Tooltip position="top" offset={15} label={'Value is missing'}>
                            <div>
                              <ErrorIcon color={colors.error} />
                            </div>
                          </Tooltip>
                        }
                        required
                        disabled={field.value === 'IS_DEFINED'}
                        error={fieldState.error?.message}
                        placeholder="Value"
                        data-test-id="filter-value-input"
                      />
                    );
                  }}
                />
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
              on: 'tenant',
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
export function Conditions2({
  isOpened,
  onClose,
  control,
  setValue,
  getValues,
}: {
  isOpened: boolean;
  onClose: () => void;
  control: any;
  setValue: any;
  getValues: any;
}) {
  const { fields, append, update, remove, insert } = useFieldArray({
    control,
    name: `conditions.0.children`,
  });

  const FilterPartTypeList = [
    { value: FilterPartTypeEnum.TENANT, label: FILTER_TO_LABEL[FilterPartTypeEnum.TENANT] },
    { value: FilterPartTypeEnum.SUBSCRIBER, label: FILTER_TO_LABEL[FilterPartTypeEnum.SUBSCRIBER] },
  ];
  console.log(28 / 4);
  function handleOnChildOnChange(index: number) {
    return (data) => {
      const newField = Object.assign({}, fields[index], { on: data });
      update(index, newField);
    };
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
            Condition for
          </Title>
        </Center>
      }
      customFooter={
        <Group ml="auto">
          <Button variant="outline" onClick={onClose} data-test-id="create-provider-instance-sidebar-cancel">
            Cancel
          </Button>
          <Button data-test-id="create-provider-instance-sidebar-create">Apply conditions</Button>
        </Group>
      }
    >
      {fields.map((item, index) => {
        const filterFieldOn = (fields[index] as any).on;

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
                  defaultValue=""
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
                  defaultValue=""
                  render={({ field, fieldState }) => {
                    return (
                      <Input
                        {...field}
                        error={fieldState.error?.message}
                        placeholder="Key"
                        data-test-id="filter-key-input"
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
                <Controller
                  control={control}
                  name={`conditions.0.children.${index}.value`}
                  defaultValue=""
                  render={({ field, fieldState }) => {
                    return (
                      <Input
                        {...field}
                        disabled={field.value === 'IS_DEFINED'}
                        error={fieldState.error?.message}
                        placeholder="Value"
                        data-test-id="filter-value-input"
                      />
                    );
                  }}
                />
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
              on: 'tenant',
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

const ItemName = () => {
  return <div>bla</div>;
};

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
