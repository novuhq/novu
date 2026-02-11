import { StepTypeEnum } from '@novu/shared';
import { IconType } from 'react-icons';
import {
  RiBracesFill,
  RiChat1Line,
  RiCodeLine,
  RiMailLine,
  RiNotificationLine,
  RiPlayCircleLine,
  RiSmartphoneLine,
  RiSpeedFill,
  RiTimeLine,
} from 'react-icons/ri';
import { InboxBell } from '../../../icons';

export const STEP_TYPE_ICONS: Record<StepTypeEnum, IconType> = {
  [StepTypeEnum.EMAIL]: RiMailLine,
  [StepTypeEnum.SMS]: RiSmartphoneLine,
  [StepTypeEnum.PUSH]: RiNotificationLine,
  [StepTypeEnum.IN_APP]: InboxBell as IconType,
  [StepTypeEnum.CHAT]: RiChat1Line,
  [StepTypeEnum.DIGEST]: RiTimeLine,
  [StepTypeEnum.DELAY]: RiTimeLine,
  [StepTypeEnum.THROTTLE]: RiSpeedFill,
  [StepTypeEnum.CUSTOM]: RiBracesFill,
  [StepTypeEnum.TRIGGER]: RiPlayCircleLine,
} as const;

export const DEFAULT_STEP_ICON = RiCodeLine;

export const ACCORDION_STYLES = {
  item: 'border-b border-b-neutral-200 bg-transparent border-t-0 border-l-0 border-r-0 rounded-none p-3',
  itemLast: 'border-b border-b-neutral-200 bg-transparent border-t-0 border-l-0 border-r-0 rounded-none p-3 border-b-0',
  trigger: 'text-label-xs',
  jsonViewer: 'border-neutral-alpha-200 bg-background text-foreground-600 rounded-lg border border-solid',
} as const;

export const DEFAULT_ACCORDION_VALUES = ['payload', 'subscriber', 'step-results', 'context'];
