/**
 * A developer-friendly variant of ChannelTypeEnum, utilizing camelCase instead of snake_case
 * to use consistent casing throughout the Framework.
 */
export enum WorkflowChannelEnum {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  CHAT = 'chat',
  /** Differs from ChannelTypeEnum in capitalization / snake_case */
  IN_APP = 'inApp',
}
