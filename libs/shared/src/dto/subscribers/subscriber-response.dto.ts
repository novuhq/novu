import { ApiProperty } from '@nestjs/swagger';
import { IChannelCredentials } from './update-subscriber.dto';

export class IChannelSettings {
  @ApiProperty()
  _integrationId: string;

  /**
   * @example slack
   */
  @ApiProperty()
  providerId: string;

  @ApiProperty()
  credentials: IChannelCredentials;
}

export class SubscriberResponseDto {
  @ApiProperty()
  _id?: string;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  phone?: string;

  @ApiProperty()
  avatar?: string;

  @ApiProperty()
  subscriberId: string;

  @ApiProperty()
  channels?: IChannelSettings[];

  @ApiProperty()
  _organizationId: string;

  @ApiProperty()
  _environmentId: string;
}
