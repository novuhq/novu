import { Grid, useMantineTheme } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import { colors, Input, Select, Tooltip } from '../../../../design-system';
import { useLayouts } from '../../../../hooks';
import { useEffect } from 'react';

export const EmailInboxContent = ({
  integration,
  index,
  readonly,
}: {
  index: number;
  readonly: boolean;
  integration: any;
}) => {
  const theme = useMantineTheme();
  const {
    control,
    getValues,
    setValue,
    formState: { errors },
  } = useFormContext();
  const { layouts, isLoading } = useLayouts(0, 100);

  useEffect(() => {
    const layout = getValues(`steps.${index}.template.layoutId`);
    if (layouts?.length && !layout) {
      const defaultLayout = layouts?.find((el) => el.isDefault);
      setTimeout(() => {
        setValue(`steps.${index}.template.layoutId`, defaultLayout?._id, { shouldValidate: true });
      }, 0);
    }
  }, [getValues, setValue, layouts, index]);

  return (
    <div
      style={{
        borderRadius: '7px',
        marginBottom: '24px',
        padding: '16px',
        background: theme.colorScheme === 'dark' ? colors.B20 : colors.B98,
      }}
    >
      <Grid grow justify="center" align="stretch">
        <Grid.Col span={3}>
          <Controller
            name={`steps.${index}.template.senderName`}
            defaultValue=""
            control={control}
            render={({ field }) => {
              return (
                <Input
                  {...field}
                  required
                  label={
                    <Tooltip label="leave empty to use sender name from integration">
                      <span>Sender name</span>
                    </Tooltip>
                  }
                  error={errors?.steps ? errors.steps[index]?.template?.senderName?.message : undefined}
                  disabled={readonly}
                  value={field.value}
                  placeholder={integration?.credentials?.senderName}
                  data-test-id="emailSenderName"
                />
              );
            }}
          />
        </Grid.Col>
        <Grid.Col span={4}>
          <div>
            <Controller
              name={`steps.${index}.template.subject`}
              defaultValue=""
              control={control}
              render={({ field }) => {
                return (
                  <Input
                    {...field}
                    label="Subject"
                    required
                    error={errors?.steps ? errors.steps[index]?.template?.subject?.message : undefined}
                    disabled={readonly}
                    value={field.value}
                    placeholder="Type the email subject..."
                    data-test-id="emailSubject"
                  />
                );
              }}
            />
          </div>
        </Grid.Col>
        <Grid.Col span={4}>
          <Controller
            name={`steps.${index}.template.preheader`}
            defaultValue=""
            control={control}
            render={({ field, fieldState }) => {
              return (
                <Input
                  {...field}
                  label="Preheader"
                  error={fieldState.error?.message}
                  disabled={readonly}
                  value={field.value}
                  placeholder="Preheader..."
                  data-test-id="emailPreheader"
                />
              );
            }}
          />
        </Grid.Col>
      </Grid>
      <Controller
        name={`steps.${index}.template.layoutId`}
        defaultValue=""
        control={control}
        render={({ field }) => {
          return (
            <Select
              {...field}
              label="Email Layout"
              data-test-id="templates-layout"
              loading={isLoading}
              disabled={readonly}
              required={(layouts || [])?.length > 0}
              error={errors?.steps ? errors?.steps[index]?.template?.layoutId?.message : undefined}
              searchable
              placeholder="Select layout"
              data={(layouts || []).map((layout) => ({ value: layout._id as string, label: layout.name }))}
            />
          );
        }}
      />
    </div>
  );
};
