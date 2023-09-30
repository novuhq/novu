// eslint-disable-next-line @typescript-eslint/naming-convention
export enum MessageChannel {
  DND = 'dnd',
  WHATSAPP = 'whatsapp',
  GENERIC = 'generic',
}

export type Media = {
  url: string;
  caption: string;
};

export type SmsParams = {
  to: string;
  from: string;
  sms: string;
  type: string;
  api_key: string;
  channel: MessageChannel;
  media?: Media;
};

export type SmsJsonResponse = {
  message_id: string;
  message: string;
  balance: number;
  user: string;
};

export type AnyObject = { [key: string]: any };
