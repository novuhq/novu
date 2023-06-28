import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IUpdateIntegrationBodyDto } from '@novu/shared';
import { IsBoolean, IsDefined, IsMongoId, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CredentialsDto } from './credentials.dto';
import { Type } from 'class-transformer';

export class UpdateIntegrationRequestDto implements IUpdateIntegrationBodyDto {
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

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    type: CredentialsDto,
  })
  @IsOptional()
  @Type(() => CredentialsDto)
  @ValidateNested()
  credentials?: CredentialsDto;

  @ApiPropertyOptional({ type: Boolean })
  @IsDefined()
  @IsBoolean()
  check?: boolean;
}
