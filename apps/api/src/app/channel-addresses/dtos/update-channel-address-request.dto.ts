import { ApiProperty } from '@nestjs/swagger';
import { ChannelAddressByType, ChannelAddressType } from '@novu/shared';
import { IsDefined } from 'class-validator';
import { getApiPropertyExamples } from '../../shared/schemas/channel-address.schema';
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
