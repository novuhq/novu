import { useEffect, useState } from 'react';
import { IOrganizationEntity, IEmailBlock } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { Input, Tabs, colors } from '../../../design-system';
import { EmailMessageEditor } from './EmailMessageEditor';
import { EmailCustomCodeEditor } from './EmailCustomCodeEditor';
import { LackIntegrationError } from '../LackIntegrationError';
import { useEnvController } from '../../../store/use-env-controller';
import { VariableManager } from '../VariableManager';
import { useIntegrations } from '../../../api/hooks';
import { Grid, useMantineTheme } from '@mantine/core';
import { format } from 'date-fns';

export function EmailContentCard({
  index,
  variables = [],
  organization,
  isIntegrationActive,
}: {
  index: number;
  variables: {
    name: string;
  }[];
  organization: IOrganizationEntity | undefined;
  isIntegrationActive: boolean;
}) {
  const { readonly } = useEnvController();
  const theme = useMantineTheme();
  const {
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext(); // retrieve all hook methods
  const contentType = watch(`steps.${index}.template.contentType`);
  const [activeTab, setActiveTab] = useState(0);
  const { integrations = [] } = useIntegrations();
  const [integration, setIntegration]: any = useState(null);

  useEffect(() => {
    if (integrations.length === 0) {
      return;
    }
    setIntegration(integrations.find((item) => item.channel === 'email') || null);
  }, [integrations, setIntegration]);

  useEffect(() => {
    if (contentType === 'customHtml') {
      setActiveTab(1);
    } else {
      setActiveTab(0);
    }
  }, [contentType]);

  const onTabChange = (tabIndex) => {
    setActiveTab(tabIndex);
    setValue(`steps.${index}.template.contentType` as any, tabIndex === 0 ? 'editor' : 'customHtml');
  };
  const menuTabs = [
    {
      label: 'Editor',
      content: (
        <Controller
          name={`steps.${index}.template.content` as any}
          control={control}
          render={({ field, formState }) => {
            return (
              <EmailMessageEditor
                branding={organization?.branding}
                onChange={field.onChange}
                value={field.value as IEmailBlock[]}
                readonly={readonly}
              />
            );
          }}
        />
      ),
    },
    {
      label: 'Custom Code',
      content: (
        <Controller
          name={`steps.${index}.template.htmlContent` as any}
          control={control}
          render={({ field, formState }) => {
            return <EmailCustomCodeEditor onChange={field.onChange} value={field.value} />;
          }}
        />
      ),
    },
  ];

  return (
    <>
      {!isIntegrationActive ? <LackIntegrationError channelType="E-Mail" /> : null}
      <div
        style={{
          fontWeight: 'bolder',
          marginBottom: '10px',
        }}
      >
        Inbox View
      </div>
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
      <div data-test-id="editor-type-selector">
        <Tabs active={activeTab} onTabChange={onTabChange} menuTabs={menuTabs} />
      </div>
      <VariableManager index={index} contents={['content', 'htmlContent', 'subject']} />
    </>
  );
}
