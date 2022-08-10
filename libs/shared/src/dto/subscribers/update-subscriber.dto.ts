import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DirectProviderIdEnum, PushProviderIdEnum } from '../../consts';

export class IChannelCredentials {
  @ApiProperty()
  webhookUrl?: string;
  @ApiPropertyOptional()
  notificationIdentifiers?: string[];
}

export class ISubscriberChannel {
  @ApiProperty({
    enum: { ...DirectProviderIdEnum, ...PushProviderIdEnum },
  })
  providerId: DirectProviderIdEnum | PushProviderIdEnum;

  @ApiProperty({
    type: IChannelCredentials,
  })
  credentials: IChannelCredentials;
}
