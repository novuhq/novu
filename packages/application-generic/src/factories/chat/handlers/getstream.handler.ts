/* eslint-disable @typescript-eslint/no-redeclare */
import { ICredentials } from '@novu/shared';
import { ChannelTypeEnum } from '@novu/stateless';
import { BaseChatHandler } from './base.handler';
import { GetstreamChatProvider } from '@novu/getstream';

export class GetstreamChatHandler extends BaseChatHandler {
  constructor() {
    super('getstream', ChannelTypeEnum.CHAT);
  }

  buildProvider(_credentials: ICredentials) {
    this.provider = new GetstreamChatProvider();
  }
}
