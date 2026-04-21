import { StepTypeEnum } from '@novu/shared';
import { IconType } from 'react-icons';
import {
  RiCellphoneFill,
  RiChatThreadFill,
  RiCodeBlock,
  RiFlashlightFill,
  RiHourglassFill,
  RiShadowLine,
  RiSpeedUpFill,
} from 'react-icons/ri';
import { Api } from '@/components/icons/api';
import { Mail3Fill } from '@/components/icons/mail-3-fill';
import { Notification5Fill } from '@/components/icons/notification-5-fill';
import { Sms } from '@/components/icons/sms';

export const STEP_TYPE_ICONS: Record<StepTypeEnum, IconType> = {
  [StepTypeEnum.CHAT]: RiChatThreadFill,
  [StepTypeEnum.CUSTOM]: RiCodeBlock,
  [StepTypeEnum.DELAY]: RiHourglassFill,
  [StepTypeEnum.DIGEST]: RiShadowLine,
  [StepTypeEnum.EMAIL]: Mail3Fill as IconType,
  [StepTypeEnum.HTTP_REQUEST]: Api as IconType,
  [StepTypeEnum.IN_APP]: Notification5Fill as IconType,
  [StepTypeEnum.PUSH]: RiCellphoneFill,
  [StepTypeEnum.SMS]: Sms as IconType,
  [StepTypeEnum.THROTTLE]: RiSpeedUpFill,
  [StepTypeEnum.TRIGGER]: RiFlashlightFill,
} as const;

export const DEFAULT_STEP_ICON = RiCodeBlock;

export const ACCORDION_STYLES = {
  item: 'border-b border-b-neutral-200 bg-transparent border-t-0 border-l-0 border-r-0 rounded-none p-3',
  itemLast: 'border-b border-b-neutral-200 bg-transparent border-t-0 border-l-0 border-r-0 rounded-none p-3 border-b-0',
  trigger: 'text-label-xs',
  jsonViewer: 'border-neutral-alpha-200 bg-background text-foreground-600 rounded-lg border border-solid',
} as const;

export const DEFAULT_ACCORDION_VALUES = ['payload', 'subscriber', 'step-results', 'context', 'env'];
