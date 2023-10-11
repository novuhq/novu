import {
  ChannelTypeEnum,
  ISendMessageSuccessResponse,
  IPushOptions,
  IPushProvider,
} from '@novu/stateless';

export class PushedPushProvider implements IPushProvider {
  id = 'Pushed';
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  constructor(
    private config: {
      
    }
  ) {
  }

  async sendMessage(
    options: IPushOptions
  ): Promise<ISendMessageSuccessResponse> {


    return {
      id: 'id_returned_by_provider',
      date: 'current_time'
    };
  }
}
