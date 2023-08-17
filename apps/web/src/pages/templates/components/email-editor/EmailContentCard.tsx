import { useEffect, useState } from 'react';
import { IOrganizationEntity, ChannelTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';

import { Tabs } from '../../../../design-system';
import { EmailMessageEditor } from './EmailMessageEditor';
import { EmailCustomCodeEditor } from './EmailCustomCodeEditor';
import { LackIntegrationAlert } from '../LackIntegrationAlert';
import {
  useEnvController,
  useActiveIntegrations,
  useIntegrationLimit,
  useIsMultiProviderConfigurationEnabled,
} from '../../../../hooks';
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
  const activeTab = contentType === 'customHtml' ? CUSTOM_CODE : EDITOR;
  const isMultiProviderConfigEnabled = useIsMultiProviderConfigurationEnabled();
  const { integrations = [] } = useActiveIntegrations();
  const [integration, setIntegration]: any = useState(null);

  const { isLimitReached } = useIntegrationLimit(ChannelTypeEnum.EMAIL);

  useEffect(() => {
    if (integrations.length === 0) {
      return;
    }
    setIntegration(
      integrations.find((item) =>
        isMultiProviderConfigEnabled ? item.channel === 'email' && item.primary : item.channel === 'email'
      ) || null
    );
  }, [isMultiProviderConfigEnabled, integrations, setIntegration]);

  const onTabChange = (value: string | null) => {
    setValue(`steps.${index}.template.contentType`, value === EDITOR ? 'editor' : 'customHtml');
  };

  const menuTabs = [
    {
      value: EDITOR,
      content: <EmailMessageEditor branding={organization?.branding} readonly={readonly} stepIndex={index} />,
    },
    {
      value: CUSTOM_CODE,
      content: (
        <Controller
          name={`steps.${index}.template.htmlContent`}
          defaultValue=""
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
      {!isIntegrationActive && isLimitReached && (
        <LackIntegrationAlert
          channelType={ChannelTypeEnum.EMAIL}
          text="Looks like you haven’t configured your E-Mail provider yet, visit the integrations page to configure."
          iconHeight={34}
          iconWidth={34}
        />
      )}
      <EmailInboxContent integration={integration} index={index} readonly={readonly} />
      <div data-test-id="email-step-settings-edit">
        <div data-test-id="editor-type-selector">
          <Tabs value={activeTab} onTabChange={onTabChange} menuTabs={menuTabs} keepMounted={false} />
        </div>
      </div>
    </>
  );
}
