import { Divider, Grid, Group, Modal, useMantineTheme } from '@mantine/core';
import { Button, colors, Input, Select, shadows, Title } from '../../design-system';
import { useTemplateController } from '../../components/templates/use-template-controller.hook';
import { Controller, useFieldArray } from 'react-hook-form';
import styled from '@emotion/styled';

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
          <Grid.Col span={2}>
            <Controller
              control={control}
              name={`steps.${stepIndex}.filters.0.value`}
              render={({ field }) => {
                return (
                  <Select
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
          <Grid.Col span={8} />
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
              Append
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
                  render={({ field }) => {
                    return <Input {...field} />;
                  }}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Controller
                  control={control}
                  name={`steps.${stepIndex}.filters.0.children.${index}.value`}
                  render={({ field }) => {
                    return <Input {...field} />;
                  }}
                />
              </Grid.Col>
              <Grid.Col span={2}>
                <Controller
                  control={control}
                  name={`steps.${index}.filters.0.children.${index}.operator`}
                  render={({ field }) => {
                    return (
                      <Select
                        data={[
                          { value: 'EQUAL', label: '===' },
                          { value: 'NOT_EQUAL', label: '!==' },
                        ]}
                        {...field}
                      />
                    );
                  }}
                />
              </Grid.Col>
              <Grid.Col span={1}>
                <FilterButton
                  variant="outline"
                  size="md"
                  mt={30}
                  onClick={() => {
                    remove(index);
                  }}
                >
                  -
                </FilterButton>
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
