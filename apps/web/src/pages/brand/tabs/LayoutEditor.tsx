import { useForm, Controller } from 'react-hook-form';
import { EmailCustomCodeEditor } from '../../../components/templates/email-editor/EmailCustomCodeEditor';
import { Center, Grid } from '@mantine/core';
import { ArrowLeft } from '../../../design-system/icons';
import { Button, Checkbox, colors, Input, Text } from '../../../design-system';
import { useEnvController } from '../../../store/use-env-controller';
import { successMessage } from '../../../utils/notifications';

export function LayoutEditor({ id, goBack }: { id: string; goBack: () => void }) {
  const { readonly } = useEnvController();

  const { handleSubmit, watch, control } = useForm({
    defaultValues: {
      layout: '',
      name: '',
      description: '',
      isDefault: false,
    },
  });

  const content = watch('layout');

  async function onUpdateLayout(data) {
    const updatePayload = {
      name: data.name,
      content: data.layout,
      isDefault: data.isDefault,
    };

    successMessage('Layout updated!');
    goBack();
  }

  return (
    <>
      <Center mb={10} data-test-id="go-back-button" onClick={() => goBack()} inline style={{ cursor: 'pointer' }}>
        <ArrowLeft color={colors.B60} />
        <Text ml={5} color={colors.B60}>
          Go Back
        </Text>
      </Center>
      <form name={'layout-form'} onSubmit={handleSubmit(onUpdateLayout)}>
        <Grid gutter={30} grow>
          <Grid.Col md={5} sm={12}>
            <Controller
              control={control}
              name="name"
              render={({ field }) => (
                <Input
                  {...field}
                  mb={30}
                  data-test-id="layout-name"
                  disabled={readonly}
                  required
                  value={field.value || ''}
                  label="Layout Name"
                  placeholder="Layout name goes here..."
                />
              )}
            />
          </Grid.Col>
          <Grid.Col md={5} sm={12}>
            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Input
                  {...field}
                  value={field.value || ''}
                  disabled={readonly}
                  mb={30}
                  data-test-id="layout-description"
                  label="Layout Description"
                  placeholder="Describe your layout..."
                />
              )}
            />
          </Grid.Col>
          <Grid.Col md={2} sm={12}>
            <Center>
              <Controller
                name="isDefault"
                control={control}
                render={({ field, fieldState }) => {
                  return (
                    <Checkbox
                      checked={field.value === true}
                      disabled={readonly}
                      onChange={field.onChange}
                      mt={30}
                      data-test-id="is-default-layout"
                      label="Set as Default"
                    />
                  );
                }}
              />
            </Center>
          </Grid.Col>
        </Grid>

        <Controller
          name="layout"
          control={control}
          render={({ field }) => {
            return <EmailCustomCodeEditor onChange={field.onChange} value={field.value} />;
          }}
        />
        <Button submit mb={20} mt={25} data-test-id="submit-layout">
          Update
        </Button>
      </form>
    </>
  );
}
