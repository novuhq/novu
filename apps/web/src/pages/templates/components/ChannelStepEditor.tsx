import { useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import { EmailMessagesCards } from './email-editor/EmailMessagesCards';
import { TemplateInAppEditor } from './in-app-editor/TemplateInAppEditor';
import { TemplateSMSEditor } from './TemplateSMSEditor';
import { TemplatePushEditor } from './TemplatePushEditor';
import { TemplateChatEditor } from './chat-editor/TemplateChatEditor';
import { SubPageWrapper } from './SubPageWrapper';
import { DigestMetadata } from '../workflow/DigestMetadata';
import { DelayMetadata } from '../workflow/DelayMetadata';
import { colors } from '../../../design-system';
import { StepName } from './StepName';
import { DeleteStepRow } from './DeleteStepRow';
import { TranslateProductLead } from './TranslateProductLead';
import { useStepIndex } from '../hooks/useStepIndex';
import { useNavigateFromEditor } from '../hooks/useNavigateFromEditor';

export const ChannelStepEditor = () => {
  const { channel } = useParams<{
    channel: StepTypeEnum | undefined;
  }>();
  const { stepIndex, variantIndex } = useStepIndex();
  const key = `${stepIndex}_${variantIndex}`;

  useNavigateFromEditor();

  if (stepIndex === -1 || channel === undefined) {
    return null;
  }

  if (channel === StepTypeEnum.IN_APP) {
    return (
      <SubPageWrapper
        key={key}
        color={colors.white}
        title={<StepName channel={channel} />}
        style={{
          width: '100%',
          borderTopLeftRadius: 7,
          borderBottomLeftRadius: 7,
          paddingBottom: 24,
        }}
      >
        <TemplateInAppEditor />
        <DeleteStepRow />
      </SubPageWrapper>
    );
  }

  if (channel === StepTypeEnum.EMAIL) {
    return (
      <SubPageWrapper
        key={key}
        color={colors.white}
        title={<StepName channel={channel} />}
        style={{
          width: '100%',
          borderTopLeftRadius: 7,
          borderBottomLeftRadius: 7,
          paddingBottom: 24,
        }}
      >
        <EmailMessagesCards />
        <DeleteStepRow />
      </SubPageWrapper>
    );
  }

  return (
    <>
      <SubPageWrapper
        key={key}
        color={colors.white}
        title={<StepName channel={channel} />}
        style={{ paddingBottom: 24 }}
      >
        {channel === StepTypeEnum.SMS && (
          <>
            <TemplateSMSEditor key={key} />
            <TranslateProductLead id="translate-sms-editor" />
          </>
        )}
        {channel === StepTypeEnum.PUSH && (
          <>
            <TemplatePushEditor key={key} />
            <TranslateProductLead id="translate-push-editor" />
          </>
        )}
        {channel === StepTypeEnum.CHAT && (
          <>
            <TemplateChatEditor key={key} />
            <TranslateProductLead id="translate-chat-editor" />
          </>
        )}
        {channel === StepTypeEnum.DIGEST && <DigestMetadata />}
        {channel === StepTypeEnum.DELAY && <DelayMetadata />}
        <DeleteStepRow />
      </SubPageWrapper>
    </>
  );
};
