import { useEffect, useState } from 'react';
import { IOrganizationEntity, IEmailBlock } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { Input, Tabs } from '../../../design-system';
import { EmailMessageEditor } from './EmailMessageEditor';
import { EmailCustomCodeEditor } from './EmailCustomCodeEditor';
import { LackIntegrationError } from '../LackIntegrationError';
import { useEnvController } from '../../../store/use-env-controller';
import { VariableManager } from '../VariableManager';

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
  const {
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext(); // retrieve all hook methods
  const contentType = watch(`steps.${index}.template.contentType`);
  const [activeTab, setActiveTab] = useState(0);

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
        <Tabs active={activeTab} onTabChange={onTabChange} menuTabs={menuTabs} />
      </div>
      <VariableManager index={index} contents={['content', 'htmlContent', 'subject']} />
    </>
  );
}
