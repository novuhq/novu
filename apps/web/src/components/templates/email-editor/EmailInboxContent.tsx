import { Grid, useMantineTheme } from '@mantine/core';
import { format } from 'date-fns';
import { Controller, useFormContext } from 'react-hook-form';
import { colors, Input } from '../../../design-system';

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
  const { control } = useFormContext();

  return (
    <div
      style={{
        background: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
        borderRadius: '7px',
        marginBottom: '40px',
        padding: '5px 10px',
      }}
    >
      <Grid grow align="center">
        <Grid.Col span={3}>
          <div
            style={{
              padding: '15px',
              borderRadius: '7px',
              border: `1px solid ${theme.colorScheme === 'dark' ? colors.B30 : colors.B80}`,
              margin: '5px 0px',
            }}
          >
            {integration ? integration?.credentials?.from : 'No active email integration'}
          </div>
        </Grid.Col>
        <Grid.Col span={4}>
          <div>
            <Controller
              name={`steps.${index}.template.subject` as any}
              control={control}
              render={({ field, fieldState }) => {
                return (
                  <Input
                    {...field}
                    error={fieldState.error?.message}
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
            name={`steps.${index}.template.preheader` as any}
            control={control}
            render={({ field, fieldState }) => {
              return (
                <Input
                  {...field}
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
        <Grid.Col
          span={1}
          sx={{
            color: colors.B60,
            fontWeight: 'normal',
          }}
        >
          {format(new Date(), 'MMM dd')}
        </Grid.Col>
      </Grid>
    </div>
  );
};
