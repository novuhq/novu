import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';

export class PushwooshPushProvider implements IPushProvider {
  id = 'pushwoosh';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  constructor(
    private config: {
      build: string;
      applicationCode: string;
    }
  ) {}

  createFiles(
    gcmSenderId: number,
    websiteURL: string,
    shortWebsiteName: string,
    applicationCode: string,
    defaultNotificationTitle: string,
    autoSubscribe: boolean,
    userId?: string,
    tags?: object,
    defaultNotificationImageURL?: string,
    safariWebsitePushID?: string
  ): string {
    const link = '<link rel="manifest" href="/manifest.json"> \n';
    const pushwooshScript =
      '<script src="https://cdn.pushwoosh.com/webpush/v3/pushwoosh-web-notifications.js" async></script> \n';

    const notificationScript =
      '<script>' +
      'var Pushwoosh = Pushwoosh || [];' +
      'Pushwoosh.push(["init", {' +
      "logLevel: 'error'," + // possible values: error, info, debug
      'applicationCode: ' +
      `${applicationCode}` +
      ',' +
      'safariWebsitePushID: ' +
      `${safariWebsitePushID}` +
      ',' +
      'defaultNotificationTitle: ' +
      `${defaultNotificationTitle}` +
      ',' +
      'defaultNotificationImage: ' +
      `${defaultNotificationImageURL}` +
      ',' +
      'autoSubscribe: ' +
      `${autoSubscribe}` +
      ',' +
      'userId: ' +
      `${userId}` +
      ',' +
      'tags: {' +
      `${tags}` +
      '}' +
      '}]);' +
      '</script> \n';

    const pushwooshInsertionScripts =
      link + pushwooshScript + notificationScript;

    return pushwooshInsertionScripts;
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {
    return {
      id: 'PLACEHOLDER',
      date: 'PLACEHOLDER',
    };
  }
}
