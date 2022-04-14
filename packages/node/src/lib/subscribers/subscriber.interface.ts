import { ChannelTypeEnum } from '../template/template.interface';

export interface ISubscriberPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  [key: string]: string | string[] | boolean | number | undefined;
}

export interface ISubscribersDefine extends ISubscriberPayload {
  subscriberId: string;
}

export type ISubscribersTriggerOptions =
  | string
  | string[]
  | ISubscribersDefine
  | ISubscribersDefine[];

export interface ITriggerPayloadOptions {
  payload: ITriggerPayload;
}

export interface ITriggerPayload {
  attachments?: IAttachmentOptions[];
  [key: string]:
    | string
    | string[]
    | boolean
    | number
    | undefined
    | IAttachmentOptions
    | IAttachmentOptions[];
}

export interface IAttachmentOptions {
  mime: string;
  file: Buffer;
  name?: string;
  channels?: ChannelTypeEnum[];
}
