import { useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import { EmailMessagesCards } from './email-editor/EmailMessagesCards';
import { TemplateInAppEditor } from './in-app-editor/TemplateInAppEditor';
import { TemplateSMSEditor } from './sms-editor/TemplateSMSEditor';
import { TemplatePushEditor } from './TemplatePushEditor';
import { TemplateChatEditor } from './chat-editor/TemplateChatEditor';
import { StepEditorSidebar } from './StepEditorSidebar';
import { DigestMetadata } from '../workflow/DigestMetadata';
import { DelayMetadata } from '../workflow/DelayMetadata';
import { useStepIndex } from '../hooks/useStepIndex';
import { useNavigateFromEditor } from '../hooks/useNavigateFromEditor';

export const ChannelStepEditor = () => {
  const { channel } = useParams<{
    channel: StepTypeEnum | undefined;
  }>();
  const { stepIndex } = useStepIndex();

  useNavigateFromEditor();

  if (stepIndex === -1 || channel === undefined) {
    return null;
  }

  if (channel === StepTypeEnum.IN_APP) {
    return (
      <StepEditorSidebar>
        <TemplateInAppEditor />
      </StepEditorSidebar>
    );
  }

  if (channel === StepTypeEnum.EMAIL) {
    return (
      <StepEditorSidebar>
        <EmailMessagesCards />
      </StepEditorSidebar>
    );
  }

  return (
    <>
      <StepEditorSidebar>
        {channel === StepTypeEnum.SMS && <TemplateSMSEditor />}
        {channel === StepTypeEnum.PUSH && <TemplatePushEditor />}
        {channel === StepTypeEnum.CHAT && <TemplateChatEditor />}
        {channel === StepTypeEnum.DIGEST && <DigestMetadata />}
        {channel === StepTypeEnum.DELAY && <DelayMetadata />}
      </StepEditorSidebar>
    </>
  );
};
