import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { useActiveIntegrations } from '../../api/hooks';
import { EmailMessagesCards } from './email-editor/EmailMessagesCards';
import { TemplateInAppEditor } from './in-app-editor/TemplateInAppEditor';
import { TemplateSMSEditor } from './TemplateSMSEditor';
import { useTemplateController } from './use-template-controller.hook';
import { ActivePageEnum } from '../../pages/templates/editor/TemplateEditorPage';
import { TemplatePushEditor } from './TemplatePushEditor';
import { TemplateChatEditor } from './chat-editor/TemplateChatEditor';

export const TemplateEditor = ({ activePage, templateId, activeStep }) => {
  const { integrations } = useActiveIntegrations();
  const { control, errors, watch } = useTemplateController(templateId);
  const steps = watch('steps');

  return (
    <div>
      {activePage === ActivePageEnum.SMS && (
        <div style={{ padding: '20px 25px' }}>
          {steps.map((message, index) => {
            return message.template.type === StepTypeEnum.SMS && activeStep === index ? (
              <TemplateSMSEditor
                key={message._id}
                control={control}
                index={index}
                errors={errors}
                isIntegrationActive={!!integrations?.some((integration) => integration.channel === ChannelTypeEnum.SMS)}
              />
            ) : null;
          })}
        </div>
      )}
      {activePage === ActivePageEnum.EMAIL && (
        <div style={{ padding: '20px 25px' }}>
          {steps.map((message, index) => {
            return message.template.type === StepTypeEnum.EMAIL && activeStep === index ? (
              <EmailMessagesCards
                key={message._id}
                index={index}
                isIntegrationActive={
                  !!integrations?.some((integration) => integration.channel === ChannelTypeEnum.EMAIL)
                }
              />
            ) : null;
          })}
        </div>
      )}
      {activePage === ActivePageEnum.IN_APP && (
        <>
          {steps.map((message, index) => {
            return message.template.type === StepTypeEnum.IN_APP && activeStep === index ? (
              <TemplateInAppEditor key={message._id} errors={errors} control={control} index={index} />
            ) : null;
          })}
        </>
      )}
      {activePage === ActivePageEnum.PUSH && (
        <div style={{ padding: '20px 25px' }}>
          {steps.map((message, index) => {
            return message.template.type === StepTypeEnum.PUSH && activeStep === index ? (
              <TemplatePushEditor
                key={message._id}
                control={control}
                index={index}
                errors={errors}
                isIntegrationActive={
                  !!integrations?.some((integration) => integration.channel === ChannelTypeEnum.PUSH)
                }
              />
            ) : null;
          })}
        </div>
      )}
      {activePage === ActivePageEnum.CHAT && (
        <div style={{ padding: '20px 25px' }}>
          {steps.map((message, index) => {
            return message.template.type === StepTypeEnum.CHAT && activeStep === index ? (
              <TemplateChatEditor
                key={index}
                errors={errors}
                control={control}
                index={index}
                isIntegrationActive={
                  !!integrations?.some((integration) => integration.channel === ChannelTypeEnum.CHAT)
                }
              />
            ) : null;
          })}
        </div>
      )}
    </div>
  );
};
