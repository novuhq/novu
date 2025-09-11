import { ApiProperty } from '@nestjs/swagger';
import {
  ChannelEndpointType,
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  ProvidersIdEnum,
  ProvidersIdEnumConst,
} from '@novu/shared';
import { IsEnum, IsOptional } from 'class-validator';

export class GetChannelEndpointsQueryDto {
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
    description: 'Endpoint type to filter results.',
    enum: Object.values(ENDPOINT_TYPES),
    required: false,
  })
  @IsEnum(Object.values(ENDPOINT_TYPES))
  @IsOptional()
  type?: ChannelEndpointType;
}
