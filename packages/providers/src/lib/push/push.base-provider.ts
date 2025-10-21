import { ChannelTypeEnum, IPushEventBody } from '@novu/stateless';
import { BaseProvider } from '../../base.provider';

export abstract class PushBaseProvider extends BaseProvider {
  channelType = ChannelTypeEnum.PUSH as ChannelTypeEnum.PUSH;

  getMessageId(body: any): string[] {
    if (body?.eventId) {
      return [body?.eventId];
    }

    return [];
  }

  parseEventBody(body: unknown | unknown[], _identifier: string): IPushEventBody | undefined {
    return {
      status: (body as any)?.eventType,
      row: JSON.stringify(body),
      date: new Date().toISOString(),
    };
  }
}
