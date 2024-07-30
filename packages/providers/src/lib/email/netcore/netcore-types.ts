export interface IRecipient {
  name?: string;
  email: string;
}

export interface IContent {
  type: 'html' | 'amp';
  value: string;
}

export interface IAttachment {
  name: string;
  content: string;
}

export interface IPersonalizations {
  attributes?: Record<string, string>;
  to?: IRecipient[];
  cc?: Pick<IRecipient, 'email'>[];
  bcc?: Pick<IRecipient, 'email'>[];
  token_to?: string;
  token_cc?: string;
  attachments?: IAttachment[];
  headers?: Record<string, unknown>;
}

export interface ISettings {
  open_track?: boolean;
  click_track?: boolean;
  unsubscribe_track?: boolean;
  ip_pool?: string;
}

export interface IEmailBody {
  from: IRecipient;
  reply_to?: string;
  subject: string;
  template_id?: number;
  tags?: string[];
  content: IContent[];
  attachments?: IAttachment[];
  personalizations?: IPersonalizations[];
  settings?: ISettings;
  bcc?: Pick<IRecipient, 'email'>[];
  schedule?: number;
}

export interface IEmailResponse {
  data: {
    message_id: string;
  };
  message: string;
  status: string;
}
