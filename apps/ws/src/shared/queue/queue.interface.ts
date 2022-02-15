export interface IDemoQueuePayload {
  userId: string;
}

export interface IWsQueuePayload {
  userId: string;
  event: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload: any;
}
