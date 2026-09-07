export enum MessagesStatusEnum {
  READ = 'read',
  SEEN = 'seen',
  UNREAD = 'unread',
  UNSEEN = 'unseen',
}

export type UrlTarget = '_self' | '_blank' | '_parent' | '_top' | '_unfencedTop';

export type Redirect = {
  url: string;
  target?: UrlTarget;
};
