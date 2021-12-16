import { IAttachmentOptions } from '@notifire/core';

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
    attachments: IMandrillAttachment[];
  };
}

export interface IMandrillAttachment {
  content: string;
  type: string;
  name: string;
}

export interface IMandrillSendResponse {
  _id: string;
}
