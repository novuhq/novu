import { ChannelTypeEnum } from '@novu/shared';
import { useState } from 'react';
import { useActiveIntegrations } from '../../api/hooks';
import { EmailMessagesCards } from './email-editor/EmailMessagesCards';
import { TemplateInAppEditor } from './in-app-editor/TemplateInAppEditor';
import { TemplateSMSEditor } from './TemplateSMSEditor';
import { useTemplateController } from './use-template-controller.hook';

export const TemplateEditor = ({ activePage, disableSave, loading, templateId }) => {
  const [view, setView] = useState<'Edit' | 'Preview'>('Edit');
  const { integrations } = useActiveIntegrations();

  const {
    changeSelectedMessage,
    trigger,
    control,
    emailMessagesFields,
    inAppFields,
    errors,
    smsFields,
    removeEmailMessage,
  } = useTemplateController(templateId);

  return (
    <div>
      {activePage === 'sms' && (
        <div style={{ padding: '20px 25px' }}>
          {smsFields.map((message, index) => {
            return (
              <TemplateSMSEditor
                key={index}
                control={control}
                index={index}
                errors={errors}
                isIntegrationActive={!!integrations?.some((integration) => integration.channel === ChannelTypeEnum.SMS)}
              />
            );
          })}
        </div>
      )}
      {activePage === 'email' && (
        <>
          <EmailMessagesCards
            variables={trigger?.variables || []}
            onRemoveTab={removeEmailMessage}
            emailMessagesFields={emailMessagesFields}
            isIntegrationActive={!!integrations?.some((integration) => integration.channel === ChannelTypeEnum.EMAIL)}
          />
        </>
      )}
      {activePage === 'in_app' && (
        <>
          {inAppFields.map((message, index) => {
            return <TemplateInAppEditor key={index} errors={errors} control={control} index={index} />;
          })}
        </>
      )}
    </div>
  );
};
