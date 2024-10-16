import { StepTypeEnum } from './enums';

export enum StepColorEnum {
  NEUTRAL = 'neutral',
  STABLE = 'stable',
  INFORMATION = 'information',
  FEATURE = 'feature',
  DESTRUCTIVE = 'destructive',
  VERIFIED = 'verified',
  ALERT = 'alert',
  HIGHLIGHTED = 'highlighted',
  WARNING = 'warning',
}

export const STEP_TYPE_TO_COLOR: Record<StepTypeEnum, StepColorEnum> = {
  [StepTypeEnum.TRIGGER]: StepColorEnum.NEUTRAL,
  [StepTypeEnum.IN_APP]: StepColorEnum.STABLE,
  [StepTypeEnum.EMAIL]: StepColorEnum.INFORMATION,
  [StepTypeEnum.CHAT]: StepColorEnum.FEATURE,
  [StepTypeEnum.SMS]: StepColorEnum.DESTRUCTIVE,
  [StepTypeEnum.PUSH]: StepColorEnum.VERIFIED,
  [StepTypeEnum.CUSTOM]: StepColorEnum.ALERT,
  [StepTypeEnum.DIGEST]: StepColorEnum.HIGHLIGHTED,
  [StepTypeEnum.DELAY]: StepColorEnum.WARNING,
};

export const triggerColor = STEP_TYPE_TO_COLOR[StepTypeEnum.TRIGGER];
export const chatColor = STEP_TYPE_TO_COLOR[StepTypeEnum.CHAT];
export const emailColor = STEP_TYPE_TO_COLOR[StepTypeEnum.EMAIL];
export const digestColor = STEP_TYPE_TO_COLOR[StepTypeEnum.DIGEST];
export const inAppColor = STEP_TYPE_TO_COLOR[StepTypeEnum.IN_APP];
export const pushColor = STEP_TYPE_TO_COLOR[StepTypeEnum.PUSH];
export const smsColor = STEP_TYPE_TO_COLOR[StepTypeEnum.SMS];
export const delayColor = STEP_TYPE_TO_COLOR[StepTypeEnum.DELAY];
export const customColor = STEP_TYPE_TO_COLOR[StepTypeEnum.CUSTOM];
