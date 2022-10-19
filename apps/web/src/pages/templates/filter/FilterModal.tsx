import { Divider, Grid, Group, Modal, useMantineTheme } from '@mantine/core';
import { Button, colors, Input, Select, shadows, Title } from '../../../design-system';
import { Controller, useFieldArray } from 'react-hook-form';
import styled from '@emotion/styled';
import { Trash } from '../../../design-system/icons';

export function FilterModal({
  isOpen,
  cancel,
  confirm,
  control,
  stepIndex,
}: {
  isOpen: boolean;
  cancel: () => void;
  confirm: () => void;
  control: any;
  stepIndex: number;
}) {
  const theme = useMantineTheme();

  const { fields, append, remove } = useFieldArray({
    control,
    name: `steps.${stepIndex}.filters.0.children`,
  });

  return (
    <>
      <Modal
        opened={isOpen}
        overlayColor={theme.colorScheme === 'dark' ? colors.BGDark : colors.BGLight}
        overlayOpacity={0.7}
        styles={{
          modal: {
            backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.white,
          },
          body: {
            paddingTop: '5px',
          },
          inner: {
            paddingTop: '180px',
          },
        }}
        title={<Title size={2}>Add filter</Title>}
        sx={{ backdropFilter: 'blur(10px)' }}
        shadow={theme.colorScheme === 'dark' ? shadows.dark : shadows.medium}
        radius="md"
        size="xl"
        onClose={() => {
          cancel();
        }}
      >
        <Grid align="center">
          <Grid.Col span={3}>
            <Controller
              control={control}
              name={`steps.${stepIndex}.filters.0.value`}
              render={({ field }) => {
                return (
                  <Select
                    placeholder="How to group rules?"
                    data={[
                      { value: 'AND', label: 'And' },
                      { value: 'OR', label: 'Or' },
                    ]}
                    {...field}
                  />
                );
              }}
            />
          </Grid.Col>
          <Grid.Col span={7} />
          <Grid.Col span={2}>
            <FilterButton
              variant="outline"
              size="md"
              mt={30}
              onClick={() => {
                append({
                  operator: 'EQUAL',
                  on: 'payload',
                });
              }}
            >
              Create rule
            </FilterButton>
          </Grid.Col>
        </Grid>
        <Divider
          sx={{
            marginTop: '15px',
            marginBottom: '15px',
          }}
        />
        {fields.map((item, index) => {
          return (
            <Grid columns={10} align="center" gutter="xs">
              <Grid.Col span={3}>
                <Controller
                  control={control}
                  name={`steps.${stepIndex}.filters.0.children.${index}.on`}
                  render={({ field }) => {
                    return (
                      <Select
                        placeholder="On"
                        data={[
                          { value: 'payload', label: 'Payload' },
                          { value: 'subscriber', label: 'Subscriber' },
                        ]}
                        {...field}
                      />
                    );
                  }}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Controller
                  control={control}
                  name={`steps.${stepIndex}.filters.0.children.${index}.field`}
                  render={({ field, fieldState }) => {
                    return <Input {...field} error={fieldState.error?.message} placeholder="Label" />;
                  }}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Controller
                  control={control}
                  name={`steps.${stepIndex}.filters.0.children.${index}.operator`}
                  render={({ field }) => {
                    return (
                      <Select
                        placeholder="Operator"
                        data={[
                          { value: 'EQUAL', label: 'Equal' },
                          { value: 'NOT_EQUAL', label: 'Not equal' },
                          { value: 'LARGER', label: 'Larger' },
                          { value: 'SMALLER', label: 'Smaller' },
                          { value: 'LARGER_EQUAL', label: 'Larger or equal' },
                          { value: 'SMALLER_EQUAL', label: 'Smaller or equal' },
                          { value: 'IN', label: 'Contains' },
                          { value: 'NOT_IN', label: 'Not contains' },
                        ]}
                        {...field}
                      />
                    );
                  }}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Controller
                  control={control}
                  name={`steps.${stepIndex}.filters.0.children.${index}.value`}
                  render={({ field, fieldState }) => {
                    return <Input {...field} error={fieldState.error?.message} placeholder="Value" />;
                  }}
                />
              </Grid.Col>
              <Grid.Col span={1}>
                <DeleteStepButton
                  variant="outline"
                  size="md"
                  mt={30}
                  onClick={() => {
                    remove(index);
                  }}
                >
                  <Trash />
                </DeleteStepButton>
              </Grid.Col>
            </Grid>
          );
        })}
        <div>
          <Group position="right">
            <Button variant="outline" size="md" mt={30} onClick={() => cancel()}>
              Cancel
            </Button>
            <Button mt={30} size="md" onClick={() => confirm()}>
              Add
            </Button>
          </Group>
        </div>
      </Modal>
    </>
  );
}

const FilterButton = styled(Button)`
  margin-top: 0px;
`;

const DeleteStepButton = styled(Button)`
  background: rgba(229, 69, 69, 0.15);
  color: ${colors.error};
  box-shadow: none;
  :hover {
    background: rgba(229, 69, 69, 0.15);
  }
  margin-top: 0px;
`;
