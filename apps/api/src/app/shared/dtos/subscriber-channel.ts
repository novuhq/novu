import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChatProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

export class ChannelCredentials {
  @ApiProperty({
    description: 'Webhook url for chat notificaton',
  })
  webhookUrl?: string;
  @ApiPropertyOptional({
    description: 'Device token for push or chat notificaton',
  })
  notificationIdentifiers?: string[];
}

export class SubscriberChannel {
  @ApiProperty({
    enum: { ...ChatProviderIdEnum, ...PushProviderIdEnum },
    description: 'Id of provider for channel',
  })
  providerId: ChatProviderIdEnum | PushProviderIdEnum;

  @ApiProperty({
    type: ChannelCredentials,
    description: 'Subscriber credentials for channel',
  })
  credentials: ChannelCredentials;
}
