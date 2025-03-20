export interface IMandrilInterface {
  messages: {
    send: (options: IMandrillSendOptions) => Promise<IMandrillSendResponse[]>;
    sendTemplate: (options: IMandrillTemplateSendOptions) => Promise<IMandrillSendResponse[]>;
  };
  users: {
    ping: () => Promise<string>;
  };
}

interface IMandrillSendOptionsMessage {
  from_email: string;
  from_name: string;
  subject: string;
  html: string;
  to: { email: string; type: 'to' | string }[];
  attachments: IMandrillAttachment[];
}
interface IMandrillTemplateSendOptionsMessage extends IMandrillSendOptionsMessage {
  global_merge_vars?: { name: string; content: string }[];
}

export interface IMandrillSendOptions {
  message: IMandrillSendOptionsMessage;
}

export interface IMandrillTemplateSendOptions {
  template_name: string;
  template_content: { name: string; content: string }[];
  message: IMandrillTemplateSendOptionsMessage;
}

export interface IMandrillAttachment {
  content: string;
  type: string;
  name: string;
}

export interface IMandrillSendResponse {
  _id: string;
}
