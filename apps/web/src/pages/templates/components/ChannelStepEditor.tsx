import { useFormContext } from 'react-hook-form';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { EmailMessagesCards } from './email-editor/EmailMessagesCards';
import { TemplateInAppEditor } from './in-app-editor/TemplateInAppEditor';
import { TemplateSMSEditor } from './TemplateSMSEditor';
import type { IForm } from './formTypes';
import { TemplatePushEditor } from './TemplatePushEditor';
import { TemplateChatEditor } from './chat-editor/TemplateChatEditor';
import { useActiveIntegrations, useEnvController } from '../../../hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { SubPageWrapper } from './SubPageWrapper';
import { DigestMetadata } from '../workflow/DigestMetadata';
import { DelayMetadata } from '../workflow/DelayMetadata';
import { colors } from '../../../design-system';
import { useEffect, useMemo } from 'react';
import { useBasePath } from '../hooks/useBasePath';
import { StepName } from './StepName';
import { DeleteStepRow } from './DeleteStepRow';
import { TranslateProductLead } from './TranslateProductLead';

export const ChannelStepEditor = () => {
  const { readonly } = useEnvController();

  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum | undefined;
    stepUuid: string;
  }>();
  const { integrations } = useActiveIntegrations();
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext<IForm>();
  const steps = watch('steps');

  const index = useMemo(
    () => steps.findIndex((message) => message.template.type === channel && message.uuid === stepUuid),
    [channel, stepUuid, steps]
  );

  const navigate = useNavigate();
  const basePath = useBasePath();

  useEffect(() => {
    if (index > -1 || steps.length === 0) {
      return;
    }
    navigate(basePath);
  }, [navigate, basePath, index, steps]);

  if (index === -1 || channel === undefined) {
    return null;
  }

  if (channel === StepTypeEnum.IN_APP) {
    return (
      <SubPageWrapper
        key={index}
        color={colors.white}
        title={<StepName index={index} color={colors.B60} channel={channel} />}
        style={{
          width: '100%',
          borderTopLeftRadius: 7,
          borderBottomLeftRadius: 7,
          paddingBottom: 24,
        }}
      >
        <TemplateInAppEditor errors={errors} control={control} index={index} />
        <DeleteStepRow />
      </SubPageWrapper>
    );
  }

  if (channel === StepTypeEnum.EMAIL) {
    return (
      <SubPageWrapper
        key={index}
        color={colors.white}
        title={<StepName index={index} color={colors.B60} channel={channel} />}
        style={{
          width: '100%',
          borderTopLeftRadius: 7,
          borderBottomLeftRadius: 7,
          paddingBottom: 24,
        }}
      >
        <EmailMessagesCards index={index} />
        <DeleteStepRow />
      </SubPageWrapper>
    );
  }

  return (
    <>
      <SubPageWrapper
        key={index}
        color={colors.white}
        title={<StepName index={index} color={colors.B60} channel={channel} />}
        style={{ paddingBottom: 24 }}
      >
        {channel === StepTypeEnum.SMS && (
          <>
            <TemplateSMSEditor key={index} control={control} index={index} errors={errors} />
            <TranslateProductLead id="translate-sms-editor" />
          </>
        )}
        {channel === StepTypeEnum.PUSH && (
          <>
            <TemplatePushEditor key={index} control={control} index={index} errors={errors} />
            <TranslateProductLead id="translate-push-editor" />
          </>
        )}
        {channel === StepTypeEnum.CHAT && (
          <>
            <TemplateChatEditor key={index} errors={errors} control={control} index={index} />
            <TranslateProductLead id="translate-chat-editor" />
          </>
        )}
        {channel === StepTypeEnum.DIGEST && <DigestMetadata index={index} readonly={readonly} />}
        {channel === StepTypeEnum.DELAY && <DelayMetadata control={control} index={index} />}
        <DeleteStepRow />
      </SubPageWrapper>
    </>
  );
};
