export interface ISendMessageRes {
  ok: boolean;
  result: {
    message_id: number;
    date: number;
  };
}
