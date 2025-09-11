import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelTypeEnum, ProvidersIdEnum, ProvidersIdEnumConst } from '@novu/shared';
import { IsEnum, IsOptional } from 'class-validator';

export class GetChannelConnectionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by channel type (email, sms, push, chat, etc.).',
    enum: ChannelTypeEnum,
    example: ChannelTypeEnum.CHAT,
  })
  @IsOptional()
  @IsEnum(ChannelTypeEnum)
  channel?: ChannelTypeEnum;

  @ApiPropertyOptional({
    description: 'Filter by provider identifier (e.g., sendgrid, twilio, slack, etc.).',
    enum: Object.values(ProvidersIdEnumConst),
    example: 'slack',
  })
  @IsOptional()
  @IsEnum(ProvidersIdEnumConst)
  provider?: ProvidersIdEnum;
}
