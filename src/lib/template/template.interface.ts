export interface ITemplate {
  id: string;

  messages: IMessage[];
}

export interface IMessage {
  subject?: string;
  channel: ChannelTypeEnum;
  template: string;
  active?: boolean | ((payload: ITriggerPayload) => Promise<boolean> | boolean);
}

export enum ChannelTypeEnum {
  EMAIL = 'email',
  SMS = 'sms',
}

export interface ITriggerPayload {
  $email?: string;
  $phone?: string;
  $user_id: string;
  [key: string]: string | boolean | number;
}
