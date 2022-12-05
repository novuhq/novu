import { useEffect, useState } from 'react';
import { IOrganizationEntity, IEmailBlock } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';

import { Tabs } from '../../../design-system';
import { EmailMessageEditor } from './EmailMessageEditor';
import { EmailCustomCodeEditor } from './EmailCustomCodeEditor';
import { LackIntegrationError } from '../LackIntegrationError';
import { useEnvController } from '../../../store/use-env-controller';
import { useActiveIntegrations } from '../../../api/hooks';
import { EmailInboxContent } from './EmailInboxContent';

const EDITOR = 'Editor';
const CUSTOM_CODE = 'Custom Code';

export function EmailContentCard({
  index,
  organization,
  isIntegrationActive,
}: {
  index: number;
  organization: IOrganizationEntity | undefined;
  isIntegrationActive: boolean;
}) {
  const { readonly } = useEnvController();
  const { control, setValue, watch } = useFormContext(); // retrieve all hook methods
  const contentType = watch(`steps.${index}.template.contentType`);
  const [activeTab, setActiveTab] = useState<string | null>(EDITOR);
  const { integrations = [] } = useActiveIntegrations();
  const [integration, setIntegration]: any = useState(null);

  useEffect(() => {
    if (integrations.length === 0) {
      return;
    }
    setIntegration(integrations.find((item) => item.channel === 'email') || null);
  }, [integrations, setIntegration]);

  useEffect(() => {
    if (contentType === 'customHtml') {
      setActiveTab(CUSTOM_CODE);
    } else {
      setActiveTab(EDITOR);
    }
  }, [contentType]);

  const onTabChange = (value: string | null) => {
    setActiveTab(value);
    setValue(`steps.${index}.template.contentType` as any, value === EDITOR ? 'editor' : 'customHtml');
  };

  const menuTabs = [
    {
      value: EDITOR,
      content: (
        <Controller
          name={`steps.${index}.template.content` as any}
          control={control}
          render={({ field }) => {
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
      value: CUSTOM_CODE,
      content: (
        <Controller
          name={`steps.${index}.template.htmlContent` as any}
          control={control}
          render={({ field }) => {
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
      <EmailInboxContent integration={integration} index={index} readonly={readonly} />

      <div data-test-id="editor-type-selector">
        <Tabs value={activeTab} onTabChange={onTabChange} menuTabs={menuTabs} />
      </div>
    </>
  );
}
