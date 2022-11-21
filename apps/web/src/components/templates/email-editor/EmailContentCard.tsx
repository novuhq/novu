import { useEffect, useState } from 'react';
import { IOrganizationEntity, IEmailBlock } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { Button, Input, Tabs, colors } from '../../../design-system';
import { EmailMessageEditor } from './EmailMessageEditor';
import { EmailCustomCodeEditor } from './EmailCustomCodeEditor';
import { LackIntegrationError } from '../LackIntegrationError';
import { useEnvController } from '../../../store/use-env-controller';
import { VariableManager } from '../VariableManager';
import { useIntegrations } from '../../../api/hooks';
import { useMantineTheme } from '@mantine/core';
import { EmailInboxContent } from './EmailInboxContent';
import { TestSendEmailModal } from './TestSendEmailModal';

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
    getValues,
  } = useFormContext(); // retrieve all hook methods
  const contentType = watch(`steps.${index}.template.contentType`);
  const [activeTab, setActiveTab] = useState(0);
  const [showTestModal, setShowTestModal] = useState(false);
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
      <Button onClick={() => setShowTestModal(true)}>Test Email</Button>

      <div
        style={{
          fontWeight: 'bolder',
          marginBottom: '10px',
        }}
      >
        Inbox View
      </div>
      <EmailInboxContent integration={integration} index={index} readonly={readonly} />
      <TestSendEmailModal
        index={index}
        isVisible={showTestModal}
        onDismiss={() => setShowTestModal(false)}
        template={getValues(`steps.${index}.template` as any)}
      />
      <div data-test-id="editor-type-selector">
        <Tabs active={activeTab} onTabChange={onTabChange} menuTabs={menuTabs} />
      </div>
      <VariableManager index={index} contents={['content', 'htmlContent', 'subject']} />
    </>
  );
}
