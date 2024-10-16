import {
  RiCellphoneFill,
  RiChatThreadFill,
  RiFlashlightFill,
  RiHourglassFill,
  RiRocket2Fill,
  RiShadowLine,
} from 'react-icons/ri';
import { Mail3Fill } from './mail-3-fill';
import { Notification5Fill } from './notification-5-fill';
import { Sms } from './sms';
import { IconType } from 'react-icons/lib';
import { StepTypeEnum } from '@/utils/enums';

export const STEP_TYPE_TO_ICON: Record<StepTypeEnum, IconType> = {
  [StepTypeEnum.CHAT]: RiChatThreadFill,
  [StepTypeEnum.CUSTOM]: RiRocket2Fill,
  [StepTypeEnum.DELAY]: RiHourglassFill,
  [StepTypeEnum.DIGEST]: RiShadowLine,
  [StepTypeEnum.EMAIL]: Mail3Fill,
  [StepTypeEnum.IN_APP]: Notification5Fill,
  [StepTypeEnum.PUSH]: RiCellphoneFill,
  [StepTypeEnum.SMS]: Sms,
  [StepTypeEnum.TRIGGER]: RiFlashlightFill,
};
