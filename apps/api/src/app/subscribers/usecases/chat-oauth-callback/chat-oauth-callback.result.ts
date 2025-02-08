export enum ResponseTypeEnum {
  HTML = 'HTML',
  URL = 'URL',
}

export class ChatOauthCallbackResult {
  typeOfResponse: ResponseTypeEnum;

  resultString: string;
}
