import { IconType } from 'react-icons/lib';
import {
  RiCellphoneFill,
  RiChatThreadFill,
  RiCodeBlock,
  RiFlashlightFill,
  RiHourglassFill,
  RiShadowLine,
} from 'react-icons/ri';
import { StepTypeEnum } from '@/utils/enums';
import { Mail3Fill } from './mail-3-fill';
import { Notification5Fill } from './notification-5-fill';
import { Sms } from './sms';

export const STEP_TYPE_TO_ICON: Record<StepTypeEnum, IconType> = {
  [StepTypeEnum.CHAT]: RiChatThreadFill,
  [StepTypeEnum.CUSTOM]: RiCodeBlock,
  [StepTypeEnum.DELAY]: RiHourglassFill,
  [StepTypeEnum.DIGEST]: RiShadowLine,
  [StepTypeEnum.EMAIL]: Mail3Fill,
  [StepTypeEnum.IN_APP]: Notification5Fill,
  [StepTypeEnum.PUSH]: RiCellphoneFill,
  [StepTypeEnum.SMS]: Sms,
  [StepTypeEnum.TRIGGER]: RiFlashlightFill,
};
