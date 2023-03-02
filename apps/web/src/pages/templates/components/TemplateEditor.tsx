import { useFormContext } from 'react-hook-form';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';

import { EmailMessagesCards } from './email-editor/EmailMessagesCards';
import { TemplateInAppEditor } from './in-app-editor/TemplateInAppEditor';
import { TemplateSMSEditor } from './TemplateSMSEditor';
import type { IForm } from './formTypes';
import { TemplatePushEditor } from './TemplatePushEditor';
import { TemplateChatEditor } from './chat-editor/TemplateChatEditor';
import { useActiveIntegrations } from '../../../hooks';
import { ActivePageEnum } from '../../../constants/editorEnums';

export const TemplateEditor = ({
  activePage,
  activeStepIndex,
}: {
  activePage: ActivePageEnum;
  activeStepIndex: number;
}) => {
  const { integrations } = useActiveIntegrations();
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext<IForm>();
  const steps = watch('steps');

  return (
    <div>
      {activePage === ActivePageEnum.SMS && (
        <div style={{ padding: '20px 25px' }}>
          {steps.map((message, index) => {
            return message.template.type === StepTypeEnum.SMS && activeStepIndex === index ? (
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
            return message.template.type === StepTypeEnum.EMAIL && activeStepIndex === index ? (
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
            return message.template.type === StepTypeEnum.IN_APP && activeStepIndex === index ? (
              <TemplateInAppEditor key={message._id} errors={errors} control={control} index={index} />
            ) : null;
          })}
        </>
      )}
      {activePage === ActivePageEnum.PUSH && (
        <div style={{ padding: '20px 25px' }}>
          {steps.map((message, index) => {
            return message.template.type === StepTypeEnum.PUSH && activeStepIndex === index ? (
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
            return message.template.type === StepTypeEnum.CHAT && activeStepIndex === index ? (
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
