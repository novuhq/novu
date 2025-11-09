export enum ResponseTypeEnum {
  HTML = 'HTML',
  URL = 'URL',
}

export class ChatOauthCallbackResult {
  type: ResponseTypeEnum;
  result: string;
}
