export interface MandrillInterface {
  messages: {
    send: (options: IMandrillSendOptions) => Promise<IMandrillSendResponse[]>;
  }
}

export interface IMandrillSendOptions {
    message: {
      from_email: string;
      subject: string;
      html: string;
      to: { email: string; type: 'to' }[];
    };
}

export interface IMandrillSendResponse {
  _id: string;
}
