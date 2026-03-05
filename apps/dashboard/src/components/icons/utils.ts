import { ACTION_PROVIDER_CONFIGS, ActionProviderIdEnum } from '@novu/shared';
import { IconType } from 'react-icons/lib';
import {
  RiCellphoneFill,
  RiChatThreadFill,
  RiCodeBlock,
  RiFlashlightFill,
  RiGlobalLine,
  RiHourglassFill,
  RiShadowLine,
  RiSpeedUpFill,
} from 'react-icons/ri';
import { StepTypeEnum } from '@/utils/enums';
import { Mail3Fill } from './mail-3-fill';
import { Notification5Fill } from './notification-5-fill';
import { Sms } from './sms';

const ICON_NAME_REGISTRY: Record<string, IconType> = {
  'ri-global-line': RiGlobalLine,
  'ri-code-block': RiCodeBlock,
};

export const ACTION_PROVIDER_ID_TO_ICON: Partial<Record<ActionProviderIdEnum, IconType>> = Object.fromEntries(
  Object.values(ACTION_PROVIDER_CONFIGS)
    .filter((c): c is typeof c & { iconName: string } => Boolean(c.iconName && ICON_NAME_REGISTRY[c.iconName]))
    .map((c) => [c.id, ICON_NAME_REGISTRY[c.iconName]])
);

export const STEP_TYPE_TO_ICON: Record<StepTypeEnum, IconType> = {
  [StepTypeEnum.CHAT]: RiChatThreadFill,
  [StepTypeEnum.CUSTOM]: RiCodeBlock,
  [StepTypeEnum.DELAY]: RiHourglassFill,
  [StepTypeEnum.DIGEST]: RiShadowLine,
  [StepTypeEnum.EMAIL]: Mail3Fill as IconType,
  [StepTypeEnum.IN_APP]: Notification5Fill as IconType,
  [StepTypeEnum.PUSH]: RiCellphoneFill,
  [StepTypeEnum.SMS]: Sms as IconType,
  [StepTypeEnum.THROTTLE]: RiSpeedUpFill,
  [StepTypeEnum.TRIGGER]: RiFlashlightFill,
};
