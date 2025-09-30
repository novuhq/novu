import { ApiPropertyOptional } from '@nestjs/swagger';
import { IUpdateIntegrationBodyDto } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsMongoId, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { StepFilterDto } from '../../shared/dtos/step-filter-dto';
import { CredentialsDto } from './credentials.dto';

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

  @ApiPropertyOptional({
    type: Boolean,
    description: 'If the integration is active the validation on the credentials field will run',
  })
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
  @IsOptional()
  @IsBoolean()
  check?: boolean;

  @ApiPropertyOptional({
    type: [StepFilterDto],
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  conditions?: StepFilterDto[];

  @ApiPropertyOptional({
    type: Object,
    description: 'Configurations for the integration',
  })
  @IsOptional()
  @IsObject()
  configurations?: Record<string, string>;
}
