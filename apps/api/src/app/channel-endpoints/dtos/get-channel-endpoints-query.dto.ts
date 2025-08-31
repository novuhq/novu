import { ApiProperty } from '@nestjs/swagger';
import { ChannelTypeEnum, ProvidersIdEnum, ProvidersIdEnumConst } from '@novu/shared';
import { IsEnum, IsOptional, IsString } from 'class-validator';

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
    description: 'Endpoint address to filter results (e.g., email address, phone number).',
    type: String,
    required: false,
  })
  @IsOptional()
  @IsString()
  endpoint?: string;
}
