import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { IconType } from 'react-icons/lib';
import { STEP_TYPE_TO_COLOR } from '../../utils/color';
import { STEP_TYPE_TO_ICON } from '../icons/utils';

export interface Usecase {
  icon: IconType;
  title: string;
  color: string;
  id: ChannelTypeEnum;
  description: string;
  image: string;
}

export const getChannelOptions = () => [
  {
    icon: STEP_TYPE_TO_ICON[StepTypeEnum.IN_APP],
    title: 'Inbox',
    color: STEP_TYPE_TO_COLOR[StepTypeEnum.IN_APP],
    id: ChannelTypeEnum.IN_APP,
    description: 'Embed real-time <Inbox/> in your product',
    image: 'in_app-preview-v3.webp',
  },
  {
    icon: STEP_TYPE_TO_ICON[StepTypeEnum.EMAIL],
    title: 'E-Mail',
    color: STEP_TYPE_TO_COLOR[StepTypeEnum.EMAIL],
    id: ChannelTypeEnum.EMAIL,
    description: 'Sends Emails to your users',
    image: 'email-preview.webp',
  },
  {
    icon: STEP_TYPE_TO_ICON[StepTypeEnum.SMS],
    title: 'SMS',
    color: STEP_TYPE_TO_COLOR[StepTypeEnum.SMS],
    id: ChannelTypeEnum.SMS,
    description: 'Sends SMS messages to your users',
    image: 'sms-preview.webp',
  },
  {
    icon: STEP_TYPE_TO_ICON[StepTypeEnum.PUSH],
    title: 'Push',
    color: STEP_TYPE_TO_COLOR[StepTypeEnum.PUSH],
    id: ChannelTypeEnum.PUSH,
    description: 'Send push notifications to your users',
    image: 'push-preview.webp',
  },
  {
    icon: STEP_TYPE_TO_ICON[StepTypeEnum.CHAT],
    title: 'Chat',
    color: STEP_TYPE_TO_COLOR[StepTypeEnum.CHAT],
    id: ChannelTypeEnum.CHAT,
    description: 'Send Slack and other chat notifications',
    image: 'chat-preview.webp',
  },
];
