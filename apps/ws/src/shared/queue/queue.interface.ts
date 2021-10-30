export interface IDemoQueuePayload {
  userId: string;
}

export interface IWsQueuePayload {
  userId: string;
  event: string;
  payload: any;
}
