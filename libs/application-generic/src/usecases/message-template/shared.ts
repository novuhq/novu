import { MessageTemplateContentType, StepTypeEnum } from '@novu/shared';

export function shouldSanitize(channelType: StepTypeEnum, contentType?: MessageTemplateContentType) {
  const channelsToSanitize = [StepTypeEnum.EMAIL, StepTypeEnum.IN_APP];

  if (!channelsToSanitize.includes(channelType)) {
    return false;
  }

  return contentType === 'editor';
}
