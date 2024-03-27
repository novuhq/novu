export interface IMandrilInterface {
  messages: {
    send: (options: IMandrillSendOptions) => Promise<IMandrillSendResponse[]>;
  };
  users: {
    ping: () => Promise<string>;
  };
}

export interface IMandrillSendOptions {
  message: {
    from_email: string;
    from_name: string;
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
