import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

export class ChannelCredentials {
  @ApiProperty({
    description: 'Webhook url for direct notificaton',
  })
  webhookUrl?: string;
  @ApiPropertyOptional({
    description: 'Device token for push or direct notificaton',
  })
  notificationIdentifiers?: string[];
}

export class SubscriberChannel {
  @ApiProperty({
    enum: { ...DirectProviderIdEnum, ...PushProviderIdEnum },
    description: 'Id of provider for channel',
  })
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  @ApiProperty({
    type: ChannelCredentials,
    description: 'Subscriber credentials for channel',
  })
  credentials: ChannelCredentials;
}
