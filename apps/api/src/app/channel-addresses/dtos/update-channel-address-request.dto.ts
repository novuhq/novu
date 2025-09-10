import { ApiProperty } from '@nestjs/swagger';
import { getApiPropertyExamples } from '@novu/application-generic';
import { ChannelAddressByType, ChannelAddressType } from '@novu/shared';
import { IsDefined } from 'class-validator';
import { IsValidChannelAddress } from '../../shared/validators/channel-address.validator';

export class UpdateChannelAddressRequestDto {
  @ApiProperty({
    description: 'Updated address data specific to the channel type',
    oneOf: getApiPropertyExamples(),
  })
  @IsDefined()
  @IsValidChannelAddress()
  address: ChannelAddressByType[ChannelAddressType];
}
