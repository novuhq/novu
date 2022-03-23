import React, { useEffect, useState } from 'react';
import { IApplication, IEmailBlock } from '@notifire/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { Input, Tabs } from '../../../design-system';
import { EmailMessageEditor } from './EmailMessageEditor';
import { EmailCustomCodeEditor } from './EmailCustomCodeEditor';

export function EmailContentCard({
  index,
  variables = [],
  application,
}: {
  index: number;
  variables: {
    name: string;
  }[];
  application: IApplication | undefined;
}) {
  const {
    control,
    formState: { errors },
    setValue,
    watch,
  } = useFormContext(); // retrieve all hook methods
  const contentType = watch(`emailMessages.${index}.template.contentType`);
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
    setValue(`emailMessages.${index}.template.contentType` as any, tabIndex === 0 ? 'editor' : 'customHtml');
  };
  const menuTabs = [
    {
      label: 'Editor',
      content: (
        <Controller
          name={`emailMessages.${index}.template.content` as any}
          control={control}
          render={({ field, formState }) => {
            return (
              <EmailMessageEditor
                branding={application?.branding}
                onChange={field.onChange}
                value={field.value as IEmailBlock[]}
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
          name={`emailMessages.${index}.template.htmlContent` as any}
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
      <Controller
        name={`emailMessages.${index}.template.subject` as any}
        control={control}
        render={({ field }) => {
          return (
            <Input
              {...field}
              mb={40}
              error={errors[`emailMessages.${index}.template.subject`]}
              label="Subject line"
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
    </>
  );
}
