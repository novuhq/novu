import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectProviderIdEnum, PushProviderIdEnum } from '@novu/shared';

export class IChannelCredentials {
  @ApiProperty({
    description: 'Webhook url for direct notificaton',
  })
  webhookUrl?: string;
  @ApiPropertyOptional({
    description: 'Device token for push or direct notificaton',
  })
  notificationIdentifiers?: string[];
}

export class ISubscriberChannel {
  @ApiProperty({
    enum: { ...DirectProviderIdEnum, ...PushProviderIdEnum },
    description: 'Id of provider for channel',
  })
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  @ApiProperty({
    type: IChannelCredentials,
    description: 'Subscriber credentials for channel',
  })
  credentials: IChannelCredentials;
}
