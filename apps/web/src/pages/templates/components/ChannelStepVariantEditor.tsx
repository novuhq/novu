import { useFormContext } from 'react-hook-form';
import { ChannelTypeEnum, providers, StepTypeEnum } from '@novu/shared';
import { EmailMessagesCards } from './email-editor/EmailMessagesCards';
import { TemplateInAppEditor } from './in-app-editor/TemplateInAppEditor';
import { TemplateSMSEditor } from './TemplateSMSEditor';
import type { IForm } from './formTypes';
import { TemplatePushEditor } from './TemplatePushEditor';
import { TemplateChatEditor } from './chat-editor/TemplateChatEditor';
import {
  useActiveIntegrations,
  useEnvController,
  useGetPrimaryIntegration,
  useHasActiveIntegrations,
} from '../../../hooks';
import { useNavigate, useParams } from 'react-router-dom';
import { SubPageWrapper } from './SubPageWrapper';
import { DigestMetadata } from '../workflow/DigestMetadata';
import { DelayMetadata } from '../workflow/DelayMetadata';
import { colors } from '../../../design-system';
import React, { useEffect, useMemo } from 'react';
import { useBasePath } from '../hooks/useBasePath';
import { StepName } from './StepName';
import { DeleteStepRow } from './DeleteStepRow';
import { TranslateProductLead } from './TranslateProductLead';
import { DisplayPrimaryProviderIcon } from '../workflow/DisplayPrimaryProviderIcon';
import { getChannel } from '../../../utils/channels';
import { CONTEXT_PATH } from '../../../config';
import { useMantineColorScheme } from '@mantine/core';
import styled from '@emotion/styled';

export const ChannelStepVariantEditor = () => {
  const { readonly } = useEnvController();

  const {
    channel,
    stepUuid = '',
    variantUuid = '',
  } = useParams<{
    channel: StepTypeEnum | undefined;
    stepUuid: string;
    variantUuid: string;
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
  }, [index, steps, basePath, navigate]);

  const variantIndex = useMemo(
    () => steps?.[index]?.variants?.findIndex((message) => message.uuid === variantUuid),
    [index, variantUuid, steps]
  );

  if (index === -1 || channel === undefined) {
    return null;
  }

  if (channel === StepTypeEnum.IN_APP) {
    return (
      <SubPageWrapper
        key={index}
        color={colors.white}
        variantIndex={variantIndex}
        index={index}
        title={<StepName variantIndex={variantIndex} index={index} color={colors.B60} channel={channel} />}
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
        variantIndex={variantIndex}
        index={index}
        title={<StepName variantIndex={variantIndex} index={index} color={colors.B60} channel={channel} />}
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
        index={index}
        variantIndex={variantIndex}
        color={colors.white}
        title={<StepName variantIndex={variantIndex} index={index} color={colors.B60} channel={channel} />}
        style={{ paddingBottom: 24 }}
      >
        {channel === StepTypeEnum.SMS && (
          <>
            <TemplateSMSEditor
              variantIndex={variantIndex}
              key={index}
              control={control}
              index={index}
              errors={errors}
            />
            <TranslateProductLead id="translate-sms-editor" />
          </>
        )}
        {channel === StepTypeEnum.PUSH && (
          <>
            <TemplatePushEditor
              variantIndex={variantIndex}
              key={index}
              control={control}
              index={index}
              errors={errors}
            />
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
