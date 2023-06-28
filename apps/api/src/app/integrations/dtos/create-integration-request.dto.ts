import { IsBoolean, IsDefined, IsEnum, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ChannelTypeEnum, ICreateIntegrationBodyDto } from '@novu/shared';

import { CredentialsDto } from './credentials.dto';

export class CreateIntegrationRequestDto implements ICreateIntegrationBodyDto {
  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsMongoId()
  _environmentId?: string;

  @ApiProperty({ type: String })
  @IsDefined()
  @IsString()
  providerId: string;

  @ApiProperty({
    enum: ChannelTypeEnum,
  })
  @IsDefined()
  @IsEnum(ChannelTypeEnum)
  channel: ChannelTypeEnum;

  @ApiPropertyOptional({
    type: CredentialsDto,
  })
  @IsOptional()
  @Type(() => CredentialsDto)
  @ValidateNested()
  credentials?: CredentialsDto;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsDefined()
  @IsBoolean()
  check?: boolean;
}
