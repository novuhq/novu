export enum ChannelTypeEnum {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  CHAT = 'chat',
  PUSH = 'push',
}

export enum ActionTypeEnum {
  TRIGGER = 'trigger',
  DIGEST = 'digest',
  DELAY = 'delay',
  CUSTOM = 'custom',
}

export type StepType = ChannelTypeEnum | ActionTypeEnum;

export enum StepTypeEnum {
  IN_APP = 'in_app',
  EMAIL = 'email',
  SMS = 'sms',
  CHAT = 'chat',
  PUSH = 'push',
  DIGEST = 'digest',
  TRIGGER = 'trigger',
  DELAY = 'delay',
  CUSTOM = 'custom',
}

export const STEP_TYPE_TO_CHANNEL_TYPE = new Map<StepTypeEnum | string, ChannelTypeEnum>([
  [StepTypeEnum.IN_APP, ChannelTypeEnum.IN_APP],
  [StepTypeEnum.EMAIL, ChannelTypeEnum.EMAIL],
  [StepTypeEnum.SMS, ChannelTypeEnum.SMS],
  [StepTypeEnum.CHAT, ChannelTypeEnum.CHAT],
  [StepTypeEnum.PUSH, ChannelTypeEnum.PUSH],
]);

export enum ChannelCTATypeEnum {
  REDIRECT = 'redirect',
}

export enum TemplateVariableTypeEnum {
  STRING = 'String',
  ARRAY = 'Array',
  BOOLEAN = 'Boolean',
}

export enum ActorTypeEnum {
  NONE = 'none',
  USER = 'user',
  SYSTEM_ICON = 'system_icon',
  SYSTEM_CUSTOM = 'system_custom',
}

export enum SystemAvatarIconEnum {
  WARNING = 'warning',
  INFO = 'info',
  ERROR = 'error',
  SUCCESS = 'success',
  UP = 'up',
  QUESTION = 'question',
}

export const CHANNELS_WITH_PRIMARY = [ChannelTypeEnum.EMAIL, ChannelTypeEnum.SMS];
export const DELAYED_STEPS = [StepTypeEnum.DELAY, StepTypeEnum.DIGEST];
