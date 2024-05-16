import { useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { IOrganizationEntity } from '@novu/shared';
import { Tabs } from '@novu/design-system';

import { useStepFormPath } from '../../hooks/useStepFormPath';
import { useActiveIntegrations, useEnvController } from '../../../../hooks';
import { EmailInboxContent } from './EmailInboxContent';
import { EmailMessageEditor } from './EmailMessageEditor';
import { CustomCodeEditor } from '../CustomCodeEditor';
import { useTemplateEditorForm } from '../TemplateEditorFormProvider';

const EDITOR = 'Editor';
const CUSTOM_CODE = 'Custom Code';

export function EmailContentCard({ organization }: { organization: IOrganizationEntity | undefined }) {
  const { template } = useTemplateEditorForm();
  const { readonly, chimera } = useEnvController({}, template?.chimera);
  const stepFormPath = useStepFormPath();
  const { control, setValue, watch } = useFormContext(); // retrieve all hook methods
  const contentType = watch(`${stepFormPath}.template.contentType`);
  const activeTab = contentType === 'customHtml' ? CUSTOM_CODE : EDITOR;
  const { integrations = [] } = useActiveIntegrations();
  const [integration, setIntegration]: any = useState(null);

  useEffect(() => {
    if (integrations.length === 0) {
      return;
    }
    setIntegration(integrations.find((item) => item.channel === 'email' && item.primary) || null);
  }, [integrations, setIntegration]);

  const onTabChange = (value: string | null) => {
    setValue(`${stepFormPath}.template.contentType`, value === EDITOR ? 'editor' : 'customHtml');
  };

  const menuTabs = [
    {
      value: EDITOR,
      content: <EmailMessageEditor branding={organization?.branding} readonly={readonly} />,
    },
    {
      value: CUSTOM_CODE,
      content: (
        <Controller
          name={`${stepFormPath}.template.htmlContent`}
          defaultValue=""
          control={control}
          render={({ field }) => {
            return <CustomCodeEditor onChange={field.onChange} value={field.value} />;
          }}
        />
      ),
    },
  ];

  return (
    <>
      <EmailInboxContent chimera={chimera} integration={integration} readonly={readonly} />
      <div data-test-id="email-step-settings-edit">
        <div data-test-id="editor-type-selector">
          <Tabs value={activeTab} onTabChange={onTabChange} menuTabs={menuTabs} keepMounted={false} />
        </div>
      </div>
    </>
  );
}
