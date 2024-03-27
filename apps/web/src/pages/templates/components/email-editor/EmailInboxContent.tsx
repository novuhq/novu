import { Grid, useMantineTheme } from '@mantine/core';
import { Controller, useFormContext } from 'react-hook-form';
import { colors, Input, Select, Tooltip } from '@novu/design-system';
import { useLayouts } from '../../../../hooks';
import { useEffect } from 'react';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { useStepFormErrors } from '../../hooks/useStepFormErrors';
import { When } from '../../../../components/utils/When';

export const EmailInboxContent = ({
  integration,
  chimera,
  readonly,
}: {
  readonly: boolean;
  chimera: boolean;
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
  const stepFormPath = useStepFormPath();
  const stepFormErrors = useStepFormErrors();

  useEffect(() => {
    const layout = getValues(`${stepFormPath}.template.layoutId`);
    if (layouts?.length && !layout) {
      const defaultLayout = layouts?.find((el) => el.isDefault);
      setTimeout(() => {
        setValue(`${stepFormPath}.template.layoutId`, defaultLayout?._id, { shouldValidate: true });
      }, 0);
    }
  }, [getValues, setValue, layouts, stepFormPath]);

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
            name={`${stepFormPath}.template.senderName`}
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
                  error={stepFormErrors ? stepFormErrors.template?.senderName?.message : undefined}
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
              name={`${stepFormPath}.template.subject`}
              defaultValue=""
              control={control}
              render={({ field }) => {
                return (
                  <Input
                    {...field}
                    label="Subject"
                    required
                    error={stepFormErrors ? stepFormErrors.template?.subject?.message : undefined}
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
          <When truthy={!chimera}>
            <Controller
              name={`${stepFormPath}.template.preheader`}
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
          </When>
        </Grid.Col>
      </Grid>
      <When truthy={!chimera}>
        <Controller
          name={`${stepFormPath}.template.layoutId`}
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
                error={stepFormErrors ? stepFormErrors.template?.layoutId?.message : undefined}
                searchable
                placeholder="Select layout"
                data={(layouts || []).map((layout) => ({ value: layout._id as string, label: layout.name }))}
              />
            );
          }}
        />
      </When>
    </div>
  );
};
