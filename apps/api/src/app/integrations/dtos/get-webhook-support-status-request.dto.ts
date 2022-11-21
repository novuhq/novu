import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

export class GetWebhookSupportStatusRequestDto {
  @ApiProperty()
  @IsDefined()
  providerId: string;

  @ApiProperty()
  @IsDefined()
  channel: ChannelTypeEnum.EMAIL | ChannelTypeEnum.SMS;
}
