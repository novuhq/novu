import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { getApiPropertyExamples } from '@novu/application-generic';
import { ADDRESS_TYPES, ChannelAddressByType, ChannelAddressType } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { IsValidChannelAddress } from '../../shared/validators/channel-address.validator';

export class CreateChannelAddressRequestDto {
  @ApiPropertyOptional({
    description: 'The unique identifier for the channel address. If not provided, one will be generated automatically.',
    type: String,
    example: 'slack-channel-user123-abc4',
  })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty({
    description: 'The identifier of the integration to use for this channel address.',
    type: String,
    example: 'slack-prod',
  })
  @IsString()
  @IsDefined()
  integrationIdentifier: string;

  @ApiPropertyOptional({
    description: 'The identifier of the channel connection to use for this channel address.',
    type: String,
    example: 'slack-connection-abc123',
  })
  @IsOptional()
  @IsString()
  connectionIdentifier?: string;

  @ApiProperty({
    description: 'Type of channel address',
    enum: Object.values(ADDRESS_TYPES),
    example: ADDRESS_TYPES.SLACK_CHANNEL,
  })
  @IsDefined()
  @IsEnum(Object.values(ADDRESS_TYPES))
  type: ChannelAddressType;

  @ApiProperty({
    description: 'Address data specific to the channel type',
    oneOf: getApiPropertyExamples(),
  })
  @IsDefined()
  @IsValidChannelAddress()
  address: ChannelAddressByType[ChannelAddressType];
}
