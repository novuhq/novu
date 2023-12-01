export interface IExecutionDetails {
  get(data: IExecutionDetailsPayload);
}

export interface IExecutionDetailsPayload {
  notificationId: string;
  subscriberId: string;
}
