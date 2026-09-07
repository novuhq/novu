export interface ISendMessageRes {
  messaging_product: string;
  contacts: IContact[];
  messages: IMessage[];
}

interface IContact {
  input: string;
  wa_id: string;
}

interface IMessage {
  id: string;
}
