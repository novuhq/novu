export interface MandrillInterface {
  messages: {
    send: (options: IMandrillSendOptions) => Promise<IMandrillSendResponse[]>;
  };
}

export interface IMandrillSendOptions {
  message: {
    from_email: string;
    subject: string;
    html: string;
    to: { email: string; type: 'to' | string }[];
	attachments: IMandrillAttachmentOptions[];	
  };
}

export interface IMandrillSendResponse {
  _id: string;
}

export interface IMandrillAttachmentOptions {
  mime: string;
  file: Buffer;
  name?: string;
  channels?: MandrillChannelTypeEnum[];
}

export enum MandrillChannelTypeEnum {
  EMAIL = 'email',
  SMS = 'sms',
  DIRECT = 'direct',
}
