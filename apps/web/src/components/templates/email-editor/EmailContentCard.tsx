import { useEffect, useState } from 'react';
import { IOrganizationEntity, IEmailBlock } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';

import { Input, Tabs } from '../../../design-system';
import { EmailMessageEditor } from './EmailMessageEditor';
import { EmailCustomCodeEditor } from './EmailCustomCodeEditor';
import { LackIntegrationError } from '../LackIntegrationError';
import { useEnvController } from '../../../store/use-env-controller';
import { VariableManager } from '../VariableManager';

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
      <Controller
        name={`steps.${index}.template.subject` as any}
        control={control}
        render={({ field, fieldState }) => {
          return (
            <Input
              {...field}
              mb={40}
              error={fieldState.error?.message}
              label="Subject line"
              disabled={readonly}
              value={field.value}
              placeholder="Type the email subject..."
              data-test-id="emailSubject"
            />
          );
        }}
      />
      <div data-test-id="editor-type-selector">
        <Tabs value={activeTab} onTabChange={onTabChange} menuTabs={menuTabs} />
      </div>
      <VariableManager index={index} contents={['content', 'htmlContent', 'subject']} />
    </>
  );
}
