import { ApiProperty } from '@nestjs/swagger';
import {
  ADDRESS_TYPES,
  ChannelAddressType,
  ChannelTypeEnum,
  ProvidersIdEnum,
  ProvidersIdEnumConst,
} from '@novu/shared';
import { IsEnum, IsOptional } from 'class-validator';

export class GetChannelAddressesQueryDto {
  @ApiProperty({
    description: 'Channel type to filter results.',
    enum: ChannelTypeEnum,
    required: false,
  })
  @IsEnum(ChannelTypeEnum)
  @IsOptional()
  channel?: ChannelTypeEnum;

  @ApiProperty({
    description: 'Provider identifier to filter results.',
    enum: Object.values(ProvidersIdEnumConst),
    required: false,
  })
  @IsEnum(Object.values(ProvidersIdEnumConst))
  @IsOptional()
  provider?: ProvidersIdEnum;

  @ApiProperty({
    description: 'Address type to filter results.',
    enum: Object.values(ADDRESS_TYPES),
    required: false,
  })
  @IsEnum(Object.values(ADDRESS_TYPES))
  @IsOptional()
  type?: ChannelAddressType;
}
