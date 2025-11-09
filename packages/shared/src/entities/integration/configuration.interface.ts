export enum InboxCountTypeEnum {
  NONE = 'none',
  UNREAD = 'unread',
  UNSEEN = 'unseen',
}

export interface IConfigurations {
  inboundWebhookEnabled?: boolean;
  inboundWebhookSigningKey?: string;
  configurationSetName?: string;
  pushResources?: string;
  inboxCount?: InboxCountTypeEnum;
}
