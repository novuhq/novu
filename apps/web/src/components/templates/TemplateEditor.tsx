import { ChannelTypeEnum } from '@novu/shared';
import { useState } from 'react';
import { useActiveIntegrations } from '../../api/hooks';
import { Button } from '../../design-system';
import WorkflowPageHeader from '../workflow/WorkflowPageHeader';
import { EditorPreviewSwitch } from './EditorPreviewSwitch';
import { EmailMessagesCards } from './email-editor/EmailMessagesCards';
import { TemplateInAppEditor } from './in-app-editor/TemplateInAppEditor';
import { TemplateSMSEditor } from './TemplateSMSEditor';

export const TemplateEditor = ({
  activePage,
  goBackHandler,
  disableSave,
  loading,
  changeSelectedMessage,
  trigger,
  control,
  emailMessagesFields,
  inAppFields,
  errors,
  smsFields,
  removeEmailMessage,
}) => {
  const [view, setView] = useState<'Edit' | 'Preview'>('Edit');
  const { integrations } = useActiveIntegrations();

  return (
    <div>
      {activePage === 'sms' && (
        <>
          <WorkflowPageHeader
            title="Edit SMS Template"
            onGoBack={goBackHandler}
            actions={
              <Button
                loading={loading}
                disabled={disableSave}
                onClick={() => changeSelectedMessage(ChannelTypeEnum.SMS)}
              >
                Save
              </Button>
            }
          >
            <EditorPreviewSwitch view={view} setView={setView} />
          </WorkflowPageHeader>
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
        </>
      )}
      {activePage === 'email' && (
        <>
          <WorkflowPageHeader
            title="Edit Email Template"
            onGoBack={goBackHandler}
            actions={
              <Button loading={loading} disabled={disableSave} onClick={() => goBackHandler()}>
                Save
              </Button>
            }
          >
            <EditorPreviewSwitch view={view} setView={setView} />
          </WorkflowPageHeader>
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
          <WorkflowPageHeader
            title="Edit Notification Template"
            onGoBack={goBackHandler}
            actions={
              <Button
                loading={loading}
                disabled={disableSave}
                onClick={() => changeSelectedMessage(ChannelTypeEnum.IN_APP)}
              >
                Save
              </Button>
            }
          >
            <EditorPreviewSwitch view={view} setView={setView} />
          </WorkflowPageHeader>
          {inAppFields.map((message, index) => {
            return <TemplateInAppEditor key={index} errors={errors} control={control} index={index} />;
          })}
        </>
      )}
    </div>
  );
};
